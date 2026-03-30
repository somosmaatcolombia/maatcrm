import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const body = await req.json()
    const { to, subject, html_body, prospect_id, advisor_id, template_id } = body

    // Validate required fields
    if (!to || !subject || !html_body) {
      throw new Error('Missing required fields: to, subject, html_body')
    }

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MAAT CRM <hola@somosmaat.org>',
        to: [to],
        subject,
        html: html_body,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', JSON.stringify(resendData))
      return new Response(
        JSON.stringify({ error: resendData?.message || 'Error enviando email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Email sent successfully — record in DB (non-blocking, errors won't affect response)
    try {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Record in sent_emails
        await supabase
          .from('sent_emails')
          .insert({
            prospect_id: prospect_id || null,
            advisor_id: advisor_id || null,
            template_id: template_id || null,
            subject,
            to_email: to,
            status: 'sent',
            sent_at: new Date().toISOString(),
          })

        // Create activity
        if (prospect_id && advisor_id) {
          await supabase
            .from('activities')
            .insert({
              prospect_id,
              advisor_id,
              activity_type: 'email',
              title: `Correo enviado: ${subject}`,
              description: `Correo enviado a ${to}`,
              metadata: {
                template_id: template_id || null,
                to_email: to,
                resend_id: resendData?.id || null,
              },
            })
        }
      }
    } catch (dbError) {
      // DB errors should never block the email success response
      console.error('DB record error (non-critical):', dbError)
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
