import { useNavigate } from 'react-router-dom'
import { Calendar, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatDate, isOverdue, getInitials } from '../../lib/utils'

export default function UpcomingContacts({ contacts, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-44 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-200 rounded w-2/3 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
      <h3 className="text-base font-semibold text-[#333333] mb-4">
        Próximos contactos
      </h3>
      {(!contacts || contacts.length === 0) ? (
        <div className="text-center py-8 text-sm text-[#6B7280]">
          <Calendar size={28} className="mx-auto mb-2 text-gray-300" />
          Sin contactos pendientes
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((prospect) => {
            const overdue = isOverdue(prospect.next_contact_date)
            return (
              <button
                key={prospect.id}
                onClick={() => navigate(`/prospects/${prospect.id}`)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 hover:shadow-sm ${
                  overdue
                    ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    overdue
                      ? 'bg-red-200 text-red-700'
                      : prospect.client_type === 'b2b'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {overdue ? (
                    <AlertTriangle size={14} />
                  ) : (
                    getInitials(prospect.full_name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#333333] truncate">
                    {prospect.full_name}
                  </p>
                  <p className={`text-[10px] font-medium ${
                    overdue ? 'text-red-600' : 'text-[#6B7280]'
                  }`}>
                    {overdue ? '⚠ Vencido: ' : ''}{formatDate(prospect.next_contact_date)}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-300 shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
