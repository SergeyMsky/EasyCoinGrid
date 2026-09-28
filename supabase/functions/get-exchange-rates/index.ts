import { corsHeaders } from '../_shared/cors.ts'

const extendedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: extendedCorsHeaders,
    })
  }

  try {
    const response = await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,GBP,JPY,CHF,CAD,AUD,UAH')

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Frankfurter failed: ${response.status} ${text}`)
    }

    const raw = (await response.json()) as Array<{
      quote: string
      rate: number
    }>

    const rates = Object.fromEntries(raw.map(({ quote, rate }) => [quote, rate])) as Record<string, number>

    return new Response(JSON.stringify({ rates }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...extendedCorsHeaders,
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...extendedCorsHeaders,
        },
      },
    )
  }
})
