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
    const { orderId, amount, title, currency, buyer_email } = await req.json()

    if (!orderId || !amount || !title) {
      throw new Error('Missing required fields: orderId, amount, title')
    }

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN_TEST') || Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!mpAccessToken) {
      throw new Error('Mercado Pago access token not configured')
    }

    // Detectar si estamos usando credencial de sandbox (empieza con TEST-)
    const isSandbox = mpAccessToken.startsWith('TEST-')

    const appUrl = req.headers.get('origin') || 'http://localhost:5173'

    // REGLA CRÍTICA DE MP: El email del payer NO puede ser el mismo que el dueño del Access Token.
    // En sandbox: usar el email de la cuenta TEST COMPRADORA (variable MP_TEST_BUYER_EMAIL).
    // En producción: usar el email real del cliente (buyer_email).
    const payerEmail = isSandbox
      ? (Deno.env.get('MP_TEST_BUYER_EMAIL') || 'test_user_uy@testuser.com')
      : (buyer_email || 'cliente@crmpunto.com')

    const preferenceData = {
      items: [
        {
          title: title,
          description: `Pago de pedido #${orderId}`,
          quantity: 1,
          currency_id: currency || 'UYU',
          unit_price: Number(amount)
        }
      ],
      payer: {
        email: payerEmail,
        name: 'Cliente',
        surname: 'Portal',
        // Identificación requerida para Uruguay (CI = Cédula de Identidad)
        identification: {
          type: 'CI',
          number: '12345678'
        }
      },
      back_urls: {
        success: `${appUrl}/portal?payment=success&order_id=${orderId}`,
        failure: `${appUrl}/portal?payment=failure&order_id=${orderId}`,
        pending: `${appUrl}/portal?payment=pending&order_id=${orderId}`
      },
      auto_return: 'approved',
      external_reference: orderId.toString(),
      statement_descriptor: 'CRMPunto', // Aparece en el resumen de la tarjeta (max 13 chars)
      // Activar cuando tengas la URL del proyecto Supabase configurada:
      // notification_url: `https://[SUPABASE_PROJECT_REF].supabase.co/functions/v1/mp-webhook`
    }

    console.log(`Creating MP preference | order: ${orderId} | amount: ${amount} | currency: ${currency || 'UYU'} | sandbox: ${isSandbox} | payerEmail: ${payerEmail}`)

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
      throw new Error(mpData.message || `MP API error ${response.status}: ${JSON.stringify(mpData)}`)
    }

    console.log(`MP preference created: ${mpData.id} | has sandbox_init_point: ${!!mpData.sandbox_init_point}`)

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
