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

      if (orderId && status === 'approved') {
        // Inicializar Supabase Admin Client para evitar RLS
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          
          // Actualizar la orden en la BD (marcar como pagada)
          // Dependiendo del esquema de DB, puede ser un status o un payment_status
          // Aquí asumimos que la tabla es orders y el campo payment_status
          await supabase
            .from('orders')
            .update({ 
              payment_status: 'paid',
              payment_id: paymentId.toString(),
              status: 'en_proceso' // Opcional: mover el estado del pedido automáticamente
            })
            .eq('id', orderId)
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
