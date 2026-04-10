import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const MORFEO_KEY = Deno.env.get('MORFEO_API_KEY')
    if (req.headers.get('x-morfeo-key') !== MORFEO_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { user_id, password } = await req.json()

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Call GoTrue Admin API directly
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ success: false, error: data.msg || data.message || JSON.stringify(data) }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, email: data.email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
