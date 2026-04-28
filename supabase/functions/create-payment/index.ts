import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { orderId, amount, title } = await req.json()

    if (!orderId || !amount || !title) {
      throw new Error('Missing required fields: orderId, amount, title')
    }

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!mpAccessToken) {
      throw new Error('Mercado Pago access token not configured')
    }

    const appUrl = req.headers.get('origin') || 'http://localhost:5173'

    const preferenceData = {
      items: [
        {
          title: title,
          description: `Pago de pedido #${orderId}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Number(amount)
        }
      ],
      back_urls: {
        success: `${appUrl}/portal/pedidos/${orderId}?payment=success`,
        failure: `${appUrl}/portal/pedidos/${orderId}?payment=failure`,
        pending: `${appUrl}/portal/pedidos/${orderId}?payment=pending`
      },
      auto_return: 'approved',
      external_reference: orderId.toString(),
      // Webhook notification URL
      // notification_url: 'https://[SUPABASE_PROJECT_REF].supabase.co/functions/v1/mp-webhook'
    }

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
      console.error('Mercado Pago error:', mpData)
      throw new Error(mpData.message || 'Error creating payment preference')
    }

    return new Response(
      JSON.stringify({ 
        preferenceId: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
