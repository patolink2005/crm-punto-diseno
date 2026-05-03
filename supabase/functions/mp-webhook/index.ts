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
      
      const externalRef = paymentInfo.external_reference
      const status = paymentInfo.status

      if (externalRef) {
        const orderIds = externalRef.split(',')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          
          if (status === 'approved') {
            const { data: ordersData, error: fetchError } = await supabase
              .from('orders')
              .select('id, total, deposit_amount, balance_due')
              .in('id', orderIds)

            if (fetchError) {
              console.error('Error fetching orders:', fetchError)
            } else if (ordersData && ordersData.length > 0) {
              const totalPaid = paymentInfo.transaction_amount || 0
              let remainingPayment = totalPaid

              console.log(`Processing APPROVED payment of ${totalPaid} for orders: ${orderIds.join(', ')}`)

              for (const order of ordersData) {
                if (remainingPayment <= 0) break

                // Calculate how much to apply to this order
                // We apply up to the balance_due, but if it's the last order or we have excess, we might apply more
                const amountToApply = Math.min(order.balance_due || 0, remainingPayment)
                const newDeposit = (order.deposit_amount || 0) + amountToApply
                const newBalance = Math.max(0, (order.total || 0) - newDeposit)

                console.log(`Updating order ${order.id}: applied ${amountToApply}, newDeposit=${newDeposit}, newBalance=${newBalance}`)

                await supabase
                  .from('orders')
                  .update({ 
                    deposit_amount: newDeposit,
                    balance_due: newBalance,
                    payment_status: 'approved',
                    payment_method: paymentInfo.payment_type_id || 'mercadopago'
                  })
                  .eq('id', order.id)

                remainingPayment -= amountToApply
              }

              // If there's still remaining payment (excess), apply it to the first order or log it
              if (remainingPayment > 0) {
                console.log(`Excess payment of ${remainingPayment} detected. Applying to first order.`)
                const firstOrder = ordersData[0]
                const { data: currentFirstOrder } = await supabase.from('orders').select('deposit_amount, total').eq('id', firstOrder.id).single()
                if (currentFirstOrder) {
                  const finalDeposit = currentFirstOrder.deposit_amount + remainingPayment
                  await supabase.from('orders').update({ 
                    deposit_amount: finalDeposit,
                    balance_due: Math.max(0, currentFirstOrder.total - finalDeposit)
                  }).eq('id', firstOrder.id)
                }
              }
            }
          } else if (status === 'rejected' || status === 'cancelled') {
            console.log(`Updating orders ${externalRef} (REJECTED/CANCELLED): status=${status}`)
            await supabase
              .from('orders')
              .update({ payment_status: 'rejected' })
              .in('id', orderIds)
          } else if (status === 'in_process' || status === 'pending') {
            console.log(`Updating orders ${externalRef} (PENDING): status=${status}`)
            await supabase
              .from('orders')
              .update({ payment_status: 'pending' })
              .in('id', orderIds)
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
