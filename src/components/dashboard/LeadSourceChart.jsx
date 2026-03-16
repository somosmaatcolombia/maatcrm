import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

const COLORS = [
  '#39A1C9',
  '#EBA055',
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#F97316',
  '#EC4899',
  '#6B7280',
  '#14B8A6',
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2">
      <p className="text-xs font-semibold text-[#333333]">{data.name}</p>
      <p className="text-sm font-bold" style={{ color: data.payload.fill }}>
        {data.value} prospectos ({data.payload.percent}%)
      </p>
    </div>
  )
}

function renderLegend({ payload }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[10px] text-[#6B7280]">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function LeadSourceChart({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-[240px] bg-gray-50 rounded-lg" />
      </div>
    )
  }

  const chartData = Object.entries(data || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = chartData.reduce((sum, d) => sum + d.value, 0)
  chartData.forEach((d) => {
    d.percent = total > 0 ? Math.round((d.value / total) * 100) : 0
  })

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
      <h3 className="text-base font-semibold text-[#333333] mb-4">
        Fuentes de leads
      </h3>
      {chartData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-[#6B7280]">
          Sin datos para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
