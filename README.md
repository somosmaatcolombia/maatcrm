# MAAT CRM

Sistema de gestión comercial para MAAT — plataforma de mentoría de alto rendimiento para profesionales. Gestiona prospectos B2B y B2C con pipeline visual Kanban, automatización de comunicaciones (email + WhatsApp), y métricas en tiempo real.

## Stack

- **Frontend:** React 18 + Vite + TailwindCSS v4
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **Email:** Resend API via Supabase Edge Functions
- **Charts:** Recharts
- **Drag & Drop:** @dnd-kit
- **Routing:** React Router v6

## Requisitos

- Node.js >= 18
- npm >= 9
- Cuenta de [Supabase](https://supabase.com) (proyecto creado)
- Cuenta de [Resend](https://resend.com) (para envío de emails)
- (Opcional) [Supabase CLI](https://supabase.com/docs/guides/cli) para migraciones locales

## Setup local

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd maat_crm
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...tu-anon-key
```

> Las claves se obtienen en **Supabase Dashboard > Settings > API**.

### 3. Configurar la base de datos

Ejecuta las migraciones SQL en orden desde **Supabase Dashboard > SQL Editor** o con la CLI:

```bash
# Con Supabase CLI (opcional)
supabase db push
```

Archivos de migración:
1. `supabase/migrations/001_init.sql` — Tablas, RLS policies, datos semilla de pipeline
2. `supabase/migrations/002_lead_scoring.sql` — Triggers de lead scoring automático
3. `supabase/migrations/003_rls_fixes.sql` — Parches de seguridad RLS (WITH CHECK)

### 4. Configurar Edge Functions (Email)

```bash
# Desde la raíz del proyecto
supabase functions deploy send-email
```

Configura el secret de Resend en Supabase:

```bash
supabase secrets set RESEND_API_KEY=re_tu_api_key
```

### 5. Crear usuario administrador

1. Ve a **Supabase Dashboard > Authentication > Users**
2. Crea un usuario con email/password
3. En **Table Editor > profiles**, actualiza el campo `role` a `admin` para ese usuario

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Ejecutar ESLint |

## Deploy en Vercel

### Variables de entorno en Vercel

Configura en **Vercel Dashboard > Settings > Environment Variables**:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://tu-proyecto.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |

### Build settings

- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm install`

## Estructura del proyecto

```
src/
├── components/
│   ├── layout/       → Sidebar, TopBar, ProtectedRoute
│   ├── prospects/    → ProspectCard, ProspectForm, WhatsAppPicker
│   ├── pipeline/     → PipelineBoard, PipelineColumn, DragDropCard
│   ├── activities/   → ActivityTimeline, ActivityForm
│   ├── emails/       → TemplateEditor, EmailComposer, EmailPreview
│   ├── dashboard/    → MetricsCards, ConversionFunnel, AdvisorTable, Charts
│   ├── admin/        → AdvisorManager, TemplateManager
│   └── ui/           → Button, Modal, Badge, Input, Tabs, Toast, EmptyState
├── pages/            → LoginPage, DashboardPage, PipelinePage, ProspectsPage, etc.
├── hooks/            → useProspects, useActivities, useMetrics, usePipeline, etc.
├── lib/              → supabase.js, email.js, constants.js, utils.js, whatsappMessages.js
├── context/          → AuthContext, PipelineContext
├── App.jsx
└── main.jsx
```

## Roles

- **Admin:** Acceso total — CRUD asesores, ver todos los prospectos, dashboard global, gestionar plantillas
- **Asesor:** Solo sus prospectos, dashboard personal, enviar emails desde plantillas aprobadas

## Convenciones

- **UI:** Español | **Código:** Inglés
- **Componentes:** PascalCase | **Hooks:** camelCase con prefijo `use`
- **Styling:** TailwindCSS exclusivamente (diseño "paper cut" con capas y sombras suaves)
- **Datos:** Custom hooks para toda lógica de datos
- **Estado global:** Context API (no Redux/Zustand)
- **Seguridad:** RLS obligatorio en todas las tablas de Supabase
