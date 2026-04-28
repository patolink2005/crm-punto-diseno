import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    
    // Mercado Pago envía notificaciones por POST (Webhooks)
    // o por GET (IPN - si se configura de esa manera)
    // Usaremos el payload del POST webhook
    let body;
    if (req.method === 'POST') {
      body = await req.json()
    } else {
      body = {
        type: url.searchParams.get('type'),
        data: { id: url.searchParams.get('data.id') }
      }
    }

    if (body.type === 'payment') {
      const paymentId = body.data?.id
      if (!paymentId) throw new Error('No payment ID found in webhook')

      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      if (!mpAccessToken) throw new Error('Mercado Pago token not configured')

      // Consultar la API de MP para obtener el estado del pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`
        }
      })

      if (!paymentResponse.ok) {
        throw new Error('Failed to fetch payment details from Mercado Pago')
      }

      const paymentInfo = await paymentResponse.json()
      
      const orderId = paymentInfo.external_reference
      const status = paymentInfo.status // 'approved', 'pending', 'rejected', etc.

      if (orderId) {
        // Inicializar Supabase Admin Client para evitar RLS
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          
          if (status === 'approved') {
            // 1. Consultar el estado actual de la orden para el cálculo del depósito
            const { data: orderData, error: fetchError } = await supabase
              .from('orders')
              .select('total, deposit_amount')
              .eq('id', orderId)
              .single()

            if (fetchError) {
              console.error('Error fetching order:', fetchError)
            } else if (orderData) {
              const amountPaid = paymentInfo.transaction_amount || 0
              const currentDeposit = orderData.deposit_amount || 0
              const newDeposit = currentDeposit + amountPaid
              const newBalanceDue = Math.max(0, orderData.total - newDeposit)

              console.log(`Updating order ${orderId} (APPROVED): newDeposit=${newDeposit}, newBalance=${newBalanceDue}`)

              const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                  deposit_amount: newDeposit,
                  balance_due: newBalanceDue,
                  payment_status: 'approved',
                  payment_method: paymentInfo.payment_type_id || 'mercadopago'
                })
                .eq('id', orderId)
                
              if (updateError) console.error('Error updating order:', updateError)
            }
          } else if (status === 'rejected' || status === 'cancelled') {
            console.log(`Updating order ${orderId} (REJECTED/CANCELLED): status=${status}`)
            await supabase
              .from('orders')
              .update({ payment_status: 'rejected' })
              .eq('id', orderId)
          } else if (status === 'in_process' || status === 'pending') {
            console.log(`Updating order ${orderId} (PENDING): status=${status}`)
            await supabase
              .from('orders')
              .update({ payment_status: 'pending' })
              .eq('id', orderId)
          }
        }
      }
    }

    // Mercado Pago espera un HTTP 200/201 en las notificaciones para marcarlas como recibidas
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    // Igual devolvemos 200 a MP para que no reintente infinitamente si es un error nuestro
    return new Response(JSON.stringify({ error: error.message }), { status: 200 })
  }
})
