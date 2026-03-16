import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../../lib/utils'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2">
      <p className="text-xs font-semibold text-[#333333] capitalize">{label}</p>
      <p className="text-sm font-bold text-[#39A1C9]">
        {formatCurrency(payload[0]?.value || 0)}
      </p>
      <p className="text-[10px] text-[#6B7280]">
        {payload[0]?.payload?.count || 0} cierres
      </p>
    </div>
  )
}

export default function MonthlyProjection({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-52 mb-4" />
        <div className="h-[240px] bg-gray-50 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
      <h3 className="text-base font-semibold text-[#333333] mb-4">
        Proyección de cierre mensual
      </h3>
      {(!data || data.length === 0) ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-[#6B7280]">
          Sin datos para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#39A1C9" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#39A1C9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#39A1C9"
              strokeWidth={2}
              fill="url(#colorValue)"
              dot={{ r: 4, fill: '#39A1C9', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#EBA055', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
