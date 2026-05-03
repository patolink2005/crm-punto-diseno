import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, orderIds, amount, title, currency, buyer_email } = await req.json()

    const ids = orderIds || (orderId ? [orderId] : [])
    
    if (ids.length === 0 || !amount || !title) {
      throw new Error('Missing required fields: orderIds (or orderId), amount, title')
    }

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!mpAccessToken) {
      throw new Error('Mercado Pago access token not configured')
    }

    // Detectar si estamos usando credencial de sandbox (empieza con TEST-)
    const isSandbox = mpAccessToken.startsWith('TEST-')

    const appUrl = req.headers.get('origin') || 'http://localhost:5173'

    // REGLA CRÍTICA DE MP: El email del payer NO puede ser el mismo que el dueño del Access Token.
    const payerEmail = isSandbox
      ? (Deno.env.get('MP_TEST_BUYER_EMAIL') || 'test_user_uy@testuser.com')
      : (buyer_email || 'cliente@crmpunto.com')

    const preferenceData = {
      items: [
        {
          title: title,
          description: ids.length > 1 
            ? `Pago consolidado de ${ids.length} pedidos`
            : `Pago de pedido #${ids[0]}`,
          quantity: 1,
          currency_id: currency || 'UYU',
          unit_price: Number(amount)
        }
      ],
      payer: {
        email: payerEmail,
        name: 'Cliente',
        surname: 'Portal',
        identification: {
          type: 'CI',
          number: '12345678'
        }
      },
      back_urls: {
        success: `${appUrl}/portal?payment=success&order_ids=${ids.join(',')}`,
        failure: `${appUrl}/portal?payment=failure&order_ids=${ids.join(',')}`,
        pending: `${appUrl}/portal?payment=pending&order_ids=${ids.join(',')}`
      },
      auto_return: 'approved',
      external_reference: ids.join(','),
      statement_descriptor: 'CRMPunto',
      notification_url: `https://slbohshctjwjldnvevnh.supabase.co/functions/v1/mp-webhook`
    }

    console.log(`Creating MP preference | orders: ${ids.join(',')} | amount: ${amount} | sandbox: ${isSandbox}`)

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferenceData)
    })

    const mpData = await response.json()

    if (!response.ok) {
      console.error('Mercado Pago API error:', JSON.stringify(mpData))
      throw new Error(mpData.message || `MP API error ${response.status}`)
    }

    // Actualizar el estado del pago a 'pending' en todos los pedidos seleccionados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      await supabase
        .from('orders')
        .update({ payment_status: 'pending' })
        .in('id', ids)
    }

    return new Response(
      JSON.stringify({ 
        preferenceId: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        isSandbox
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('create-payment function error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
