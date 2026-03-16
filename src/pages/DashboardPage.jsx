import { useState } from 'react'
import {
  RefreshCw,
  Download,
} from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { useMetrics } from '../hooks/useMetrics'
import MetricsCards from '../components/dashboard/MetricsCards'
import ConversionFunnel from '../components/dashboard/ConversionFunnel'
import UpcomingContacts from '../components/dashboard/UpcomingContacts'
import AdvisorTable from '../components/dashboard/AdvisorTable'
import LeadSourceChart from '../components/dashboard/LeadSourceChart'
import MonthlyProjection from '../components/dashboard/MonthlyProjection'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/utils'
import { showSuccess, showError } from '../components/ui/Toast'

export default function DashboardPage() {
  const { profile, isAdmin } = useAuthContext()
  const { metrics, loading, refreshMetrics } = useMetrics()
  const [exporting, setExporting] = useState(false)

  async function handleExportCSV() {
    setExporting(true)
    try {
      let query = supabase
        .from('prospects')
        .select('full_name, email, phone, client_type, pipeline_stage, lead_score, estimated_value, company_name, company_size, job_title, country, city, lead_source, next_contact_date, tags, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (!isAdmin) {
        query = query.eq('advisor_id', profile.id)
      }

      const { data, error } = await query
      if (error) throw error

      if (!data || data.length === 0) {
        showError('No hay prospectos para exportar')
        return
      }

      const csvData = data.map((p) => ({
        Nombre: p.full_name || '',
        Email: p.email || '',
        Teléfono: p.phone || '',
        Tipo: p.client_type === 'b2b' ? 'B2B' : 'B2C',
        Etapa: p.pipeline_stage || '',
        'Lead Score': p.lead_score ?? 0,
        'Valor Estimado': p.estimated_value ?? 0,
        Empresa: p.company_name || '',
        'Tamaño Empresa': p.company_size || '',
        Cargo: p.job_title || '',
        País: p.country || '',
        Ciudad: p.city || '',
        Fuente: p.lead_source || '',
        'Próximo Contacto': p.next_contact_date ? formatDate(p.next_contact_date) : '',
        Tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
        'Fecha Creación': formatDate(p.created_at),
        'Última Actualización': formatDate(p.updated_at),
      }))

      const filename = `prospectos_maat_${new Date().toISOString().split('T')[0]}.csv`
      exportToCSV(csvData, filename)
      showSuccess(`${data.length} prospectos exportados`)
    } catch (err) {
      showError(err.message || 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">
            {isAdmin ? 'Dashboard Global' : 'Mi Dashboard'}
          </h1>
          <p className="text-sm text-[#6B7280]">
            {isAdmin
              ? 'Vista general de todos los asesores y prospectos'
              : `Bienvenido, ${profile?.full_name?.split(' ')[0] || 'Asesor'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            loading={exporting}
          >
            <Download size={14} />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <MetricsCards metrics={metrics} loading={loading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionFunnel data={metrics.funnelData} loading={loading} />
        <UpcomingContacts contacts={metrics.upcomingContacts} loading={loading} />
      </div>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Advisor performance table */}
          <AdvisorTable data={metrics.advisorPerformance} loading={loading} />

          {/* Admin charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeadSourceChart data={metrics.bySource} loading={loading} />
            <MonthlyProjection data={metrics.monthlyProjection} loading={loading} />
          </div>
        </>
      )}

      {/* Advisor-only: lead source + monthly projection */}
      {!isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadSourceChart data={metrics.bySource} loading={loading} />
          <MonthlyProjection data={metrics.monthlyProjection} loading={loading} />
        </div>
      )}
    </div>
  )
}
