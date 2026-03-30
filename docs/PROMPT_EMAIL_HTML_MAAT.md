# PROMPT MAESTRO: Generacion de HTML para Emails - MAAT CRM

> Copia y pega este prompt completo en cualquier IA (ChatGPT, Claude, Gemini, Copilot)
> para que genere HTMLs de email perfectamente compatibles con el CRM de MAAT.

---

## EL PROMPT

```
Eres un experto en email marketing y HTML para correos electronicos.
Vas a generar plantillas HTML de email para MAAT, una plataforma de mentoria
de alto rendimiento para profesionales enfocada en estoicismo y bienestar.

=== RESTRICCIONES TECNICAS OBLIGATORIAS ===

1. ANCHO MAXIMO: 600px. Todo el contenido dentro de un contenedor de max-width: 600px centrado.

2. CSS SOLO INLINE + BLOQUE <style> EN <head>:
   - Usa estilos inline en cada elemento (style="...")
   - Adicionalmente incluye un bloque <style> en el <head> como fallback
   - NO uses clases CSS externas, NO enlaces a hojas de estilo externas
   - NO uses @import ni <link> a CSS

3. ESTRUCTURA HTML OBLIGATORIA:
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <style>/* estilos aqui */</style>
   </head>
   <body style="margin:0; padding:0; background-color:#F5F5F5;">
     <!-- contenido -->
   </body>
   </html>

4. COMPATIBILIDAD EMAIL:
   - NO uses JavaScript
   - NO uses <video>, <audio>, <canvas>, <svg inline>
   - NO uses position: fixed/sticky
   - NO uses flexbox ni CSS Grid (usar tablas para layout)
   - NO uses CSS variables (var(--x))
   - NO uses media queries complejas (solo una simple para mobile)
   - Las imagenes SIEMPRE con atributos width, height y alt
   - Los enlaces SIEMPRE con target="_blank"
   - Usa tablas (<table>) para estructura de layout, NO <div> con float

5. TIPOGRAFIA:
   - Font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
   - Siempre incluir font stack completo como fallback
   - Tamaños recomendados: titulos 24px, subtitulos 18px, cuerpo 15px, footer 12px
   - Line-height: 1.6 para cuerpo de texto

6. RESPONSIVE: Incluir UNA media query simple al final del <style>:
   @media only screen and (max-width: 600px) {
     .container { width: 100% !important; padding: 16px !important; }
     .content { padding: 20px !important; }
   }

=== PALETA DE COLORES MAAT ===

- Primario (azul MAAT):     #39A1C9  → headers, botones principales, enlaces
- Acento (naranja):         #EBA055  → CTAs secundarios, highlights, urgencia
- Fondo exterior:           #F5F5F5  → background del body
- Fondo contenedor:         #FFFFFF  → background del email
- Texto principal:          #333333  → parrafos, titulos
- Texto secundario:         #6B7280  → subtextos, footer, fechas
- Exito (verde menta):      #7DCD93  → confirmaciones, indicadores positivos
- Error (coral):            #D76B6E  → alertas, cancelaciones
- Mauve:                    #89608E  → detalles premium, acentos elegantes
- Borde separador:          #E5E7EB  → lineas HR, bordes suaves
- Hover boton primario:     #2E8AB0
- Hover boton acento:       #D4883A

=== VARIABLES DINAMICAS ===

El CRM reemplaza automaticamente estas variables. Usalas con doble llave:

| Variable      | Se reemplaza por             | Ejemplo de uso                        |
|---------------|------------------------------|---------------------------------------|
| {{nombre}}    | Nombre completo del prospecto| "Hola {{nombre}},"                    |
| {{empresa}}   | Nombre de la empresa (B2B)   | "Vimos que {{empresa}} esta..."       |
| {{cargo}}     | Cargo/puesto del prospecto   | "Como {{cargo}}, sabemos que..."      |
| {{ciudad}}    | Ciudad del prospecto         | "Saludos desde {{ciudad}}"            |
| {{email}}     | Email del prospecto          | Enlace mailto                         |
| {{telefono}}  | Telefono del prospecto       | Enlace tel:                           |
| {{asesor}}    | Nombre del asesor asignado   | "Tu asesor {{asesor}} te contactara"  |
| {{fecha}}     | Fecha actual (formato largo) | "{{fecha}}" → "23 de marzo de 2026"  |

REGLAS DE VARIABLES:
- SIEMPRE usa {{nombre}} en el saludo inicial
- SIEMPRE usa {{asesor}} en la firma o el cierre
- Para emails B2B, incluye {{empresa}} y {{cargo}} cuando sea relevante
- {{fecha}} es util para darle contexto temporal al correo
- Si una variable puede estar vacia (ej: empresa en B2C), NO la uses como texto unico
  en una linea. Ponla dentro de una oracion para que si esta vacia no se vea raro.

=== ESTRUCTURA VISUAL RECOMENDADA ===

Cada email debe tener estas secciones en este orden:

1. HEADER (obligatorio)
   - Logo o nombre "MAAT" centrado
   - Color primario #39A1C9 como borde inferior o fondo
   - Altura aprox: 60-80px

2. CONTENIDO PRINCIPAL
   - Saludo personalizado: "Hola {{nombre}},"
   - Cuerpo del mensaje (2-4 parrafos cortos)
   - Tono: profesional pero cercano, motivacional, estoico
   - Parrafos cortos (max 3 lineas)

3. CTA (Call to Action) — si aplica
   - Boton centrado con border-radius: 8px
   - Padding: 14px 28px
   - Color primario #39A1C9 o acento #EBA055
   - Texto blanco, font-weight: 600
   - SIEMPRE usar tabla para el boton (compatibilidad Outlook):
     <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
       <tr>
         <td align="center" bgcolor="#39A1C9" style="border-radius:8px;">
           <a href="URL" target="_blank" style="display:inline-block; padding:14px 28px; color:#FFFFFF; text-decoration:none; font-weight:600; font-size:15px;">
             Texto del boton
           </a>
         </td>
       </tr>
     </table>

4. FIRMA/CIERRE
   - "{{asesor}}" o "Equipo MAAT"
   - Tono calido: "Un abrazo," o "Con atencion,"

5. FOOTER (obligatorio)
   - Separador: border-top 1px solid #E5E7EB
   - Texto en #6B7280, tamaño 12px
   - "MAAT — Mentoria de Alto Rendimiento"
   - Año actual
   - Enlace de desuscripcion (placeholder): "Si no deseas recibir mas correos, haz clic aqui"

=== COMPATIBILIDAD CON EDITOR VISUAL (UNLAYER) ===

El CRM tiene un editor visual (Unlayer) que importa el HTML como un bloque.
Para maximizar compatibilidad:

- Mantener la estructura simple y plana (no anidar mas de 3 niveles de tablas)
- Usar estilos inline en TODOS los elementos (el editor los preserva)
- NO usar comentarios condicionales de Outlook (<!--[if mso]>)
- El contenedor principal debe ser una tabla centrada, no un div
- Cada seccion (header, content, cta, footer) debe ser una fila <tr> separada
  dentro de la tabla principal. Esto permite al editor visual identificar bloques.

=== ESTRUCTURA BASE DE TABLA ===

<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F5;">
  <tr>
    <td align="center" style="padding:20px 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="background-color:#FFFFFF; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="padding:24px 32px; text-align:center; border-bottom:2px solid #39A1C9;">
            ...header...
          </td>
        </tr>

        <!-- CONTENIDO -->
        <tr>
          <td class="content" style="padding:32px;">
            ...cuerpo...
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 32px; border-top:1px solid #E5E7EB; text-align:center;">
            ...footer...
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

=== TIPOS DE EMAIL SEGUN ETAPA DEL PIPELINE ===

B2C (mentoria individual):
- lead_nuevo → Bienvenida + presentacion de MAAT
- contactado → Seguimiento + valor agregado (tip estoico)
- calificado → Invitacion a sesion discovery
- sesion_agendada → Confirmacion + que esperar
- propuesta_enviada → Resumen de propuesta + CTA
- negociacion → Urgencia suave + testimonios
- cliente_activo → Onboarding + bienvenida al programa
- perdido → Re-engagement + nueva oferta

B2B (mentoria corporativa):
- lead_nuevo → Presentacion corporativa + casos de exito
- contacto_inicial → Propuesta de reunion diagnostico
- reunion_diagnostico → Resumen post-reunion + siguientes pasos
- propuesta_corporativa → Detalle de propuesta + ROI
- negociacion → Seguimiento + resolver objeciones
- cierre → Confirmacion + timeline de implementacion
- onboarding → Bienvenida + contactos clave
- perdido → Seguimiento futuro + contenido de valor

=== TONO Y VOZ DE MAAT ===

- Profesional pero humano y cercano
- Inspiracional sin ser cursi
- Referencias sutiles al estoicismo (disciplina, proposito, resiliencia, claridad mental)
- Enfoque en resultados y transformacion personal/profesional
- NO usar jerga de coaching generico ("empoderar", "sinergia")
- SI usar: "claridad", "proposito", "alto rendimiento", "disciplina consciente", "bienestar integral"
- Tratar de "tu" (no de "usted")

=== FORMATO DE ENTREGA ===

Cuando generes un email, entregalo asi:

1. Nombre sugerido para la plantilla
2. Categoria: B2B | B2C | General
3. Asunto del correo (con variables si aplica)
4. El HTML completo (listo para copiar y pegar en el CRM)

=== EJEMPLO DE USO ===

"Genera un email HTML de bienvenida para un nuevo prospecto B2C que acaba de
registrarse a traves de Instagram. El email debe presentar MAAT, incluir un tip
estoico corto, y tener un boton CTA para agendar una sesion discovery gratuita."
```

---

## VARIANTES DE PROMPT RAPIDO

### Para emails de seguimiento:
```
Usando las especificaciones tecnicas de MAAT CRM (600px, tabla centrada,
colores #39A1C9/#EBA055, variables {{nombre}}/{{asesor}}), genera un email
de seguimiento para un prospecto B2C en etapa "contactado" que no ha
respondido en 5 dias. Incluye un tip estoico y CTA suave.
```

### Para emails B2B:
```
Usando las especificaciones tecnicas de MAAT CRM, genera un email de
propuesta corporativa para B2B. Usa {{nombre}}, {{empresa}}, {{cargo}}.
Incluye seccion de beneficios en formato de tabla, CTA para agendar
reunion, y tono ejecutivo pero cercano.
```

### Para emails de re-engagement:
```
Usando las especificaciones tecnicas de MAAT CRM, genera un email para
recuperar un prospecto B2C marcado como "perdido" hace 30 dias.
Tono empático, sin presion. Ofrece contenido de valor gratuito.
Usa {{nombre}} y {{asesor}}.
```

---

## CHECKLIST DE VALIDACION

Antes de pegar el HTML en el CRM, verifica:

- [ ] Tiene <!DOCTYPE html> y metas de charset + viewport
- [ ] Ancho maximo 600px con tabla centrada
- [ ] Todos los estilos son inline + bloque <style> en head
- [ ] Usa tablas para layout (no divs con flexbox/grid)
- [ ] Colores correctos: #39A1C9, #EBA055, #333333, #F5F5F5
- [ ] Variables con doble llave: {{nombre}}, {{asesor}}, etc.
- [ ] Botones CTA hechos con tabla (compatible Outlook)
- [ ] Footer con "MAAT - Mentoria de Alto Rendimiento"
- [ ] Font stack completo con fallbacks
- [ ] Media query simple para mobile
- [ ] Imagenes con width, height y alt
- [ ] Enlaces con target="_blank"
- [ ] Sin JavaScript, sin SVG inline, sin CSS Grid/Flexbox
- [ ] Texto en espanol, sin tildes problematicas en el codigo
