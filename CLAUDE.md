# MAAT CRM - Sistema de Gestión Comercial

## Descripción del Proyecto

MAAT CRM es el sistema de gestión comercial de MAAT, plataforma de mentoría de alto rendimiento para profesionales. Gestiona prospectos en dos modelos de negocio (B2B y B2C) con pipeline visual, automatización de comunicaciones y métricas en tiempo real.

> **Documento técnico completo:** `/docs/MAAT_CRM_Documento_Tecnico.docx` — contiene la arquitectura detallada, modelo de datos, pipelines, y especificaciones de cada módulo.

---

## Stack Tecnológico

- **Frontend:** React 18 + Vite + TailwindCSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Hosting:** Vercel (frontend) + Supabase Cloud (backend)
- **Email:** Resend API (transaccional + plantillas HTML)
- **WhatsApp:** Link wa.me (MVP) → WhatsApp Cloud API de Meta (fase posterior)
- **Gráficos:** Recharts
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
- **Iconos:** Lucide React
- **Fechas:** date-fns
- **Routing:** React Router v6

---

## Estructura de Carpetas

```
maat-crm/
├── docs/
│   └── MAAT_CRM_Documento_Tecnico.docx
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql
│   └── functions/
│       ├── send-email/
│       └── calculate-lead-score/
├── src/
│   ├── components/
│   │   ├── layout/          → Sidebar, TopBar, ProtectedRoute
│   │   ├── prospects/       → ProspectCard, ProspectForm, ProspectDetail
│   │   ├── pipeline/        → PipelineBoard, PipelineColumn, DragDropCard
│   │   ├── activities/      → ActivityTimeline, ActivityForm
│   │   ├── emails/          → TemplateEditor, TemplatePicker, EmailComposer
│   │   ├── dashboard/       → MetricsCards, ConversionChart, AdvisorTable
│   │   ├── admin/           → AdvisorManager, PipelineConfig, TemplateManager
│   │   └── ui/              → Button, Modal, Badge, Input, Select, Tabs, Toast
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── PipelinePage.jsx
│   │   ├── ProspectsPage.jsx
│   │   ├── ProspectDetailPage.jsx
│   │   ├── EmailsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── AdminPage.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useProspects.js
│   │   ├── useActivities.js
│   │   ├── usePipeline.js
│   │   └── useMetrics.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── email.js
│   │   ├── constants.js
│   │   └── utils.js
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── PipelineContext.jsx
│   ├── App.jsx
│   └── main.jsx
├── .env.local
├── CLAUDE.md
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Convenciones de Código

### Naming
- **Componentes React:** PascalCase → `ProspectCard.jsx`
- **Hooks:** camelCase con prefijo `use` → `useProspects.js`
- **Funciones/variables:** camelCase → `getProspects`, `handleSubmit`
- **Tablas Supabase:** snake_case → `pipeline_stages`
- **Columnas Supabase:** snake_case → `full_name`, `created_at`
- **Constantes:** UPPER_SNAKE_CASE → `MAX_LEAD_SCORE`
- **CSS:** TailwindCSS utility classes exclusivamente (no CSS custom)

### Patrones obligatorios
- Custom hooks para TODA lógica de datos (useProspects, useActivities, etc.)
- Context API para estado global (auth, pipeline config). NO usar Redux ni Zustand.
- React Router v6 con rutas protegidas por rol via componente `ProtectedRoute`
- Toast notifications para feedback de acciones (éxito, error)
- Loading skeletons en lugar de spinners genéricos
- Optimistic updates para drag & drop del pipeline
- Composición sobre herencia. Componentes funcionales siempre.

### Idioma
- **UI (textos visibles al usuario):** Español
- **Código (variables, funciones, componentes, comentarios):** Inglés

---

## Diseño Visual: Concepto "Paper Cut" MAAT

Todos los componentes deben seguir este lenguaje visual:

### Paleta de colores
```
Primary:    #0F3460  (Azul oscuro MAAT)
Accent:     #E94560  (Rojo MAAT)
Background: #F5F5F5  (Gris claro)
Surface:    #FFFFFF  (Blanco)
Text:       #1A1A2E  (Casi negro)
Gray:       #6B7280  (Texto secundario)
Success:    #10B981  (Verde)
Warning:    #F59E0B  (Amarillo)
Error:      #EF4444  (Rojo)
```

### Reglas de estilo
- Bordes redondeados: `rounded-xl` en cards y contenedores, `rounded-lg` en botones e inputs
- Sombras: `shadow-md` base con `hover:shadow-lg` y `transition-shadow duration-200`
- Capas superpuestas: cards sobre fondo gris, modales con overlay semi-transparente
- Transiciones suaves: `transition-all duration-200` en todos los elementos interactivos
- Espaciado consistente: `p-6` en cards, `gap-4` entre elementos, `p-4` en contenedores menores
- Sidebar oscura (`bg-[#1A1A2E]`) con texto claro, contenido principal sobre fondo claro

### Clases Tailwind reutilizables
```
Card:     "bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg"
Button Primary: "bg-[#0F3460] text-white rounded-lg px-4 py-2 hover:bg-[#16213E] transition-colors duration-200"
Button Accent:  "bg-[#E94560] text-white rounded-lg px-4 py-2 hover:bg-[#C73E54] transition-colors duration-200"
Input:    "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F3460] focus:border-transparent outline-none transition-all duration-200"
Badge B2C: "bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
Badge B2B: "bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
```

---

## Roles y Permisos

### Administrador (admin)
- CRUD completo de asesores
- Ver TODOS los prospectos de todos los asesores
- Reasignar prospectos entre asesores
- Dashboard global con métricas comparativas
- Gestionar plantillas de correo
- Configurar etapas del pipeline
- Exportar datos

### Asesor (advisor)
- CRUD de sus propios prospectos únicamente
- Mover prospectos entre etapas del pipeline
- Registrar actividades
- Enviar correos desde plantillas preaprobadas
- Ver su dashboard personal
- NO puede ver prospectos de otros asesores
- NO puede modificar configuraciones del sistema

---

## Modelo de Datos Resumido

### profiles (extiende auth.users)
`id (UUID PK)` · `full_name` · `email` · `role (admin|advisor)` · `phone` · `active (bool)` · `avatar_url` · `created_at`

### prospects (tabla central)
`id (UUID PK)` · `advisor_id (FK)` · `client_type (b2b|b2c)` · `full_name` · `email` · `phone` · `country` · `city` · `company_name (B2B)` · `company_size (B2B)` · `job_title` · `pipeline_stage` · `lead_score (0-100)` · `lead_source` · `estimated_value` · `next_contact_date` · `tags[]` · `created_at` · `updated_at`

### activities (timeline de interacciones)
`id (UUID PK)` · `prospect_id (FK)` · `advisor_id (FK)` · `activity_type (call|email|whatsapp|meeting|note|stage_change)` · `title` · `description` · `metadata (JSONB)` · `created_at`

### pipeline_stages
`id (UUID PK)` · `name` · `slug` · `client_type (b2b|b2c)` · `order_index` · `color` · `auto_email_template_id (FK)`

### email_templates
`id (UUID PK)` · `name` · `subject` · `html_body` · `category (b2b|b2c|general)` · `pipeline_stage` · `variables[]` · `active (bool)` · `created_at`

### sent_emails
`id (UUID PK)` · `prospect_id (FK)` · `advisor_id (FK)` · `template_id (FK)` · `subject` · `to_email` · `status (sent|failed|bounced)` · `sent_at`

---

## Pipeline Stages (Datos semilla)

### B2C
1. Lead Nuevo (#6B7280) → 2. Contactado (#3B82F6) → 3. Calificado (#8B5CF6) → 4. Sesión Agendada (#F59E0B) → 5. Propuesta Enviada (#EC4899) → 6. Negociación (#F97316) → 7. Cliente Activo (#10B981) → 8. Perdido (#EF4444)

### B2B
1. Lead Nuevo (#6B7280) → 2. Contacto Inicial (#3B82F6) → 3. Reunión Diagnóstico (#8B5CF6) → 4. Propuesta Corporativa (#F59E0B) → 5. Negociación (#F97316) → 6. Cierre (#EC4899) → 7. Onboarding (#10B981) → 8. Perdido (#EF4444)

---

## RLS (Row Level Security) — Reglas Críticas

### prospects
- `SELECT`: Admin → todos. Advisor → solo `WHERE advisor_id = auth.uid()`
- `INSERT`: Advisor → solo con `advisor_id = auth.uid()`. Admin → cualquier advisor_id
- `UPDATE`: Advisor → solo sus propios. Admin → todos
- `DELETE`: Solo admin (preferir soft delete)

### activities
- `SELECT`: Admin → todas. Advisor → solo `WHERE advisor_id = auth.uid()`
- `INSERT`: Advisor → solo con `advisor_id = auth.uid()`

### email_templates
- `SELECT`: Todos los autenticados
- `INSERT/UPDATE/DELETE`: Solo admin

---

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

En Supabase Edge Function secrets:
```
RESEND_API_KEY=re_xxxxx
```

---

## Roadmap de Fases

### ✅ Fase 1: Fundación (Semana 1-2) ← EMPEZAR AQUÍ
- [x] Crear proyecto React + Vite + TailwindCSS
- [x] Crear estructura de carpetas completa
- [x] Configurar Supabase: todas las tablas + RLS + datos semilla de pipeline
- [x] Implementar AuthContext + login con roles
- [x] Componente ProtectedRoute
- [x] Layout: Sidebar + TopBar
- [ ] CRUD completo de prospectos (formulario B2B y B2C)
- [ ] Vista lista de prospectos con filtros y búsqueda
- [ ] Admin: CRUD de asesores
- [ ] Deploy inicial en Vercel

### Fase 2: Pipeline + Actividades (Semana 3-4)
- [ ] Vista Kanban con drag & drop (@dnd-kit)
- [ ] Sistema de actividades: timeline en detalle de prospecto
- [ ] Registro automático de cambios de etapa
- [ ] Próximo contacto con alertas visuales
- [ ] Botón "Abrir WhatsApp" con wa.me

### Fase 3: Email + Plantillas (Semana 5-6)
- [ ] CRUD plantillas email (admin)
- [ ] Editor HTML con preview
- [ ] Edge Function send-email via Resend
- [ ] EmailComposer con variables dinámicas

### Fase 4: Dashboard + Métricas (Semana 7-8)
- [ ] Dashboard asesor + admin
- [ ] Gráficos de conversión con Recharts
- [ ] Lead scoring automático
- [ ] Exportación CSV

### Fase 5: WhatsApp + Optimizaciones (Semana 9-10)
- [ ] Integración WhatsApp Cloud API
- [ ] Automatizaciones por etapa
- [ ] Optimización UX

---

## Instrucciones para Claude Code

Cuando trabajes en este proyecto:

1. **Siempre lee este archivo CLAUDE.md antes de cada tarea** para mantener consistencia.
2. **Referencia el documento técnico** en `/docs/MAAT_CRM_Documento_Tecnico.docx` para detalles específicos de cada módulo.
3. **Trabaja fase por fase.** No implementes funcionalidades de fases futuras.
4. **Sigue estrictamente** las convenciones de naming, patrones y diseño visual documentados arriba.
5. **Cada componente debe ser funcional e independiente.** Los datos siempre fluyen a través de custom hooks.
6. **Toda UI en español.** Todo código en inglés.
7. **Concepto visual "paper cut"** en cada componente: capas, sombras suaves, bordes redondeados, transiciones fluidas.
8. **Supabase RLS es obligatorio** en cada tabla. Nunca desactivar RLS.
9. **Valida siempre** que los cambios de base de datos no rompan las políticas RLS existentes.
10. **Genera datos semilla** para pipeline_stages (B2B y B2C) en el script SQL inicial.
