import { useState, useMemo } from 'react'
import {
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  FileText,
  RefreshCw,
  Mail,
  Clock,
} from 'lucide-react'
import { useAuthContext } from '../context/AuthContext'
import { useEmailHistory } from '../hooks/useEmailHistory'
import { useEmailTemplates } from '../hooks/useEmailTemplates'
import TemplateManager from '../components/admin/TemplateManager'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { formatRelativeDate } from '../lib/utils'

const STATUS_CONFIG = {
  sent: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Enviado' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Fallido' },
  bounced: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Rebotado' },
}

export default function EmailsPage() {
  const { isAdmin } = useAuthContext()
  const { emails, loading: emailsLoading, fetchEmails } = useEmailHistory()
  const { templates } = useEmailTemplates()

  const [activeTab, setActiveTab] = useState(isAdmin ? 'templates' : 'history')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const tabs = useMemo(() => {
    const list = []
    if (isAdmin) {
      list.push({ value: 'templates', label: 'Plantillas', count: templates.length })
    }
    list.push({ value: 'history', label: 'Historial de envios', count: emails.length })
    return list
  }, [isAdmin, templates.length, emails.length])

  const filteredEmails = useMemo(() => {
    if (!searchQuery) return emails
    const q = searchQuery.toLowerCase()
    return emails.filter(
      (e) =>
        e.subject?.toLowerCase().includes(q) ||
        e.to_email?.toLowerCase().includes(q) ||
        e.prospects?.full_name?.toLowerCase().includes(q)
    )
  }, [emails, searchQuery])

  // Summary stats
  const emailStats = useMemo(() => {
    const sent = emails.filter((e) => e.status === 'sent').length
    const failed = emails.filter((e) => e.status === 'failed').length
    const bounced = emails.filter((e) => e.status === 'bounced').length
    return { sent, failed, bounced, total: emails.length }
  }, [emails])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetchEmails()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#333333]">Correos</h1>
        <p className="text-sm text-[#6B7280]">
          {isAdmin ? 'Gestiona plantillas y revisa el historial de envios' : 'Historial de correos enviados'}
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Templates tab (admin only) */}
      {activeTab === 'templates' && isAdmin && <TemplateManager />}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Stats summary */}
          {emails.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: emailStats.total, icon: Mail, bg: 'bg-blue-50', color: 'text-blue-600' },
                { label: 'Enviados', value: emailStats.sent, icon: CheckCircle, bg: 'bg-green-50', color: 'text-green-600' },
                { label: 'Fallidos', value: emailStats.failed, icon: XCircle, bg: 'bg-red-50', color: 'text-red-600' },
                { label: 'Rebotados', value: emailStats.bounced, icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600' },
              ].map(({ label, value, icon: Icon, bg, color }) => (
                <div key={label} className="bg-white rounded-xl shadow-md p-4 transition-shadow duration-200 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon size={16} className={color} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#333333]">{value}</p>
                      <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search + Refresh */}
          <div className="bg-white rounded-xl shadow-md p-4 transition-shadow duration-200 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por asunto, email o nombre..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Email list */}
          {emailsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/5 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEmails.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Sin correos enviados"
              description={
                searchQuery
                  ? 'No se encontraron correos con esa busqueda.'
                  : 'Los correos enviados desde el CRM apareceran aqui.'
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredEmails.map((email) => {
                const status = STATUS_CONFIG[email.status] || STATUS_CONFIG.sent
                const StatusIcon = status.icon
                return (
                  <div
                    key={email.id}
                    className="bg-white rounded-xl shadow-md p-4 transition-shadow duration-200 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${status.bg} flex items-center justify-center shrink-0`}>
                        <StatusIcon size={18} className={status.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h4 className="text-sm font-semibold text-[#333333] truncate">
                            {email.subject || 'Sin asunto'}
                          </h4>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] truncate">
                          Para: {email.prospects?.full_name || email.to_email}
                          {email.to_email && email.prospects?.full_name && (
                            <span className="text-gray-400"> ({email.to_email})</span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                          {email.email_templates?.name && (
                            <span className="flex items-center gap-1">
                              <FileText size={10} />
                              {email.email_templates.name}
                            </span>
                          )}
                          {email.profiles?.full_name && (
                            <span>por {email.profiles.full_name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatRelativeDate(email.sent_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
