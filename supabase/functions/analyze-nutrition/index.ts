import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// This function is deprecated. Use analyze-screenshot with context='nutrition' instead.
serve(async () => {
  return new Response(JSON.stringify({ error: 'This endpoint is deprecated. Use analyze-screenshot.' }), {
    status: 410,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://justinkaram14.github.io',
    },
  })
})
