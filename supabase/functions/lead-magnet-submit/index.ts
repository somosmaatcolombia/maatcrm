import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json()

    const {
      lead_magnet_slug,
      full_name,
      email,
      phone,
      country,
      delivery_method,
      total_score,
      total_percentage,
      level_name,
      level_number,
      dimension_scores,
      answers,
      source,
      utm_medium,
      utm_campaign,
    } = body

    if (!lead_magnet_slug) {
      throw new Error('Missing required field: lead_magnet_slug')
    }

    // Look up the lead magnet
    const { data: leadMagnet, error: lmError } = await supabase
      .from('lead_magnets')
      .select('id, name')
      .eq('slug', lead_magnet_slug)
      .single()

    if (lmError || !leadMagnet) {
      throw new Error(`Lead magnet not found: ${lead_magnet_slug}`)
    }

    // Extract tracking info from request
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || ''
    const user_agent = req.headers.get('user-agent') || ''

    // Insert the response
    const { data: response, error: insertError } = await supabase
      .from('lead_magnet_responses')
      .insert({
        lead_magnet_id: leadMagnet.id,
        full_name: full_name || null,
        email: email || null,
        phone: phone || null,
        country: country || null,
        delivery_method: delivery_method || 'none',
        total_score,
        total_percentage,
        level_name,
        level_number,
        dimension_scores: dimension_scores || {},
        answers: answers || {},
        source: source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        ip_address,
        user_agent,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error('Error saving response')
    }

    // Send results via email if requested
    if (delivery_method === 'email' && email && RESEND_API_KEY) {
      try {
        await sendResultsEmail({
          to: email,
          name: full_name || '',
          percentage: Math.round(total_percentage),
          levelName: level_name,
          dimensionScores: dimension_scores || {},
        })
      } catch (emailError) {
        console.error('Email send error (non-critical):', emailError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: response.id,
        // Return WhatsApp link if requested
        whatsapp_link: delivery_method === 'whatsapp' && phone
          ? buildWhatsAppLink(phone, full_name, Math.round(total_percentage), level_name)
          : null,
      }),
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

async function sendResultsEmail({ to, name, percentage, levelName, dimensionScores }: {
  to: string
  name: string
  percentage: number
  levelName: string
  dimensionScores: Record<string, number>
}) {
  const dimensionLabels: Record<string, string> = {
    regulacion: 'Regulación Emocional',
    valores: 'Decisiones desde Valores',
    respuesta: 'Respuesta Consciente',
    claridad: 'Claridad en Caos',
  }

  const dimensionsHtml = Object.entries(dimensionScores)
    .map(([key, value]) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #eee;font-weight:600;color:#333;">${dimensionLabels[key] || key}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:center;">
          <span style="background:linear-gradient(135deg,#39A1C9,#EBA055);color:white;padding:4px 14px;border-radius:20px;font-weight:700;">${Math.round(value as number)}%</span>
        </td>
      </tr>
    `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#333333,#1a1a1a);color:white;padding:40px 30px;text-align:center;">
          <h1 style="margin:0 0 10px;font-size:24px;">🧠 Tu Resultado MAAT</h1>
          <p style="margin:0;opacity:0.9;">Test de Performance Emocional</p>
        </div>
        <div style="padding:30px;">
          <p style="color:#555;font-size:16px;">Hola${name ? ` <strong>${name}</strong>` : ''},</p>
          <p style="color:#555;line-height:1.6;">Aquí tienes tus resultados del Test MAAT de Performance Emocional:</p>

          <div style="background:linear-gradient(135deg,#39A1C9,#EBA055);color:white;padding:30px;border-radius:12px;text-align:center;margin:25px 0;">
            <div style="font-size:48px;font-weight:700;">${percentage}%</div>
            <div style="background:rgba(255,255,255,0.2);display:inline-block;padding:8px 24px;border-radius:20px;margin-top:10px;font-weight:600;">${levelName}</div>
          </div>

          <h3 style="color:#333333;margin:25px 0 15px;">Detalle por Dimensión</h3>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #eee;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:12px 16px;text-align:left;color:#666;font-size:13px;">Dimensión</th>
                <th style="padding:12px 16px;text-align:center;color:#666;font-size:13px;">Puntaje</th>
              </tr>
            </thead>
            <tbody>${dimensionsHtml}</tbody>
          </table>

          <div style="background:#f0f4ff;padding:20px;border-radius:8px;margin-top:25px;border-left:4px solid #39A1C9;">
            <p style="margin:0;color:#333333;font-weight:600;">¿Quieres ir al siguiente nivel?</p>
            <p style="margin:10px 0 0;color:#555;line-height:1.6;">El Sistema de Mentoría MAAT integra neurociencia, filosofía práctica y metacognición aplicada para llevarte a alto rendimiento sostenible.</p>
          </div>

          <div style="text-align:center;margin-top:30px;">
            <a href="https://somosmaat.org/descubrimiento/" style="background:linear-gradient(135deg,#333333,#1a1a1a);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Agendar Llamada Estratégica</a>
          </div>
        </div>
        <div style="background:#f8f9fa;padding:20px;text-align:center;color:#999;font-size:12px;">
          © MAAT — Sistema de Mentoría de Alto Rendimiento<br>
          <a href="https://somosmaat.org" style="color:#39A1C9;">somosmaat.org</a>
        </div>
      </div>
    </body>
    </html>
  `

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'MAAT <hola@somosmaat.org>',
      to: [to],
      subject: `🧠 Tu Resultado MAAT: ${percentage}% — ${levelName}`,
      html,
    }),
  })

  if (!resendResponse.ok) {
    const errorData = await resendResponse.json()
    throw new Error(`Resend error: ${JSON.stringify(errorData)}`)
  }
}

function buildWhatsAppLink(phone: string, name: string, percentage: number, levelName: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const message = encodeURIComponent(
    `¡Hola${name ? ` ${name}` : ''}! 🧠\n\n` +
    `Aquí están tus resultados del *Test MAAT de Performance Emocional*:\n\n` +
    `📊 *Puntaje General:* ${percentage}%\n` +
    `🏷️ *Nivel:* ${levelName}\n\n` +
    `¿Te gustaría saber cómo llegar al siguiente nivel? Agenda una llamada estratégica gratuita:\n` +
    `👉 https://somosmaat.org/descubrimiento/`
  )
  return `https://wa.me/${cleanPhone}?text=${message}`
}
