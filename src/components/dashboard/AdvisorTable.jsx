import { getInitials, formatCurrency } from '../../lib/utils'

export default function AdvisorTable({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-56 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
        <h3 className="text-base font-semibold text-[#333333] mb-4">
          Rendimiento por asesor
        </h3>
        <p className="text-sm text-[#6B7280] text-center py-6">Sin datos de asesores</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg overflow-hidden">
      <h3 className="text-base font-semibold text-[#333333] mb-4">
        Rendimiento por asesor
      </h3>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 pr-4">
                Asesor
              </th>
              <th className="text-center text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 px-2">
                Total
              </th>
              <th className="text-center text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 px-2">
                Activos
              </th>
              <th className="text-center text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 px-2">
                Ganados
              </th>
              <th className="text-center text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 px-2">
                Perdidos
              </th>
              <th className="text-center text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 px-2">
                Conversión
              </th>
              <th className="text-right text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 px-2">
                Pipeline
              </th>
              <th className="text-center text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold pb-3 pl-2">
                Actividades
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((advisor, idx) => (
              <tr
                key={advisor.id}
                className={`border-b border-gray-50 hover:bg-gray-50 transition-colors duration-150 ${
                  idx === 0 ? 'bg-amber-50/40' : ''
                }`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#39A1C9] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {getInitials(advisor.name)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#333333] truncate max-w-[150px]">
                        {advisor.name}
                      </p>
                      {idx === 0 && (
                        <span className="text-[9px] text-amber-600 font-medium">★ Líder</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-center text-xs font-medium text-[#333333] px-2 py-3">
                  {advisor.total}
                </td>
                <td className="text-center text-xs font-medium text-blue-600 px-2 py-3">
                  {advisor.active}
                </td>
                <td className="text-center text-xs font-medium text-green-600 px-2 py-3">
                  {advisor.won}
                </td>
                <td className="text-center text-xs font-medium text-red-500 px-2 py-3">
                  {advisor.lost}
                </td>
                <td className="text-center px-2 py-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      advisor.conversionRate >= 30
                        ? 'bg-green-100 text-green-700'
                        : advisor.conversionRate >= 15
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {advisor.conversionRate}%
                  </span>
                </td>
                <td className="text-right text-xs font-semibold text-[#333333] px-2 py-3">
                  {formatCurrency(advisor.pipelineValue)}
                </td>
                <td className="text-center text-xs font-medium text-[#6B7280] pl-2 py-3">
                  {advisor.activitiesCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
