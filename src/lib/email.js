import { supabase } from './supabase'
import { EMAIL_VARIABLES } from './constants'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Send an email using the Supabase Edge Function
 */
export async function sendEmail({ to, subject, htmlBody, prospectId, advisorId, templateId }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // Get the current user's access token for auth
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || anonKey

  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({
      to,
      subject,
      html_body: htmlBody,
      prospect_id: prospectId,
      advisor_id: advisorId,
      template_id: templateId,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error || `Error ${response.status} al enviar email`)
  }

  return data
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(template, variables = {}) {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(regex, value || '')
  })
  return result
}

/**
 * Resolve all template variables from prospect + advisor data
 */
export function resolveVariables(prospect, advisorName = '') {
  const variables = {}

  EMAIL_VARIABLES.forEach(({ key, field }) => {
    if (field === '_advisor_name') {
      variables[key] = advisorName || ''
    } else if (field === '_today') {
      variables[key] = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })
    } else {
      variables[key] = prospect?.[field] || ''
    }
  })

  return variables
}

/**
 * Extract variable keys used in a template string
 */
export function extractVariables(template) {
  if (!template) return []
  const regex = /\{\{\s*(\w+)\s*\}\}/g
  const found = new Set()
  let match
  while ((match = regex.exec(template)) !== null) {
    found.add(match[1])
  }
  return Array.from(found)
}

/**
 * Default HTML email template
 */
export const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #F5F5F5;
    }
    .container {
      background-color: #FFFFFF;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #39A1C9;
    }
    .header h1 {
      color: #39A1C9;
      font-size: 24px;
      margin: 0;
    }
    .content {
      margin-bottom: 24px;
    }
    .content p {
      margin: 0 0 12px;
    }
    .cta-button {
      display: inline-block;
      background-color: #39A1C9;
      color: #FFFFFF;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      font-size: 12px;
      color: #6B7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MAAT</h1>
    </div>
    <div class="content">
      <p>Hola {{nombre}},</p>
      <p>Escribe aquí el contenido de tu correo...</p>
    </div>
    <div class="footer">
      <p>MAAT - Mentoría de Alto Rendimiento</p>
      <p>Este correo fue enviado por {{asesor}}</p>
    </div>
  </div>
</body>
</html>`
