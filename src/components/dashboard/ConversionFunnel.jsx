import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2">
      <p className="text-xs font-semibold text-[#333333]">{data.name}</p>
      <p className="text-sm font-bold" style={{ color: data.color }}>
        {data.value} prospectos
      </p>
    </div>
  )
}

export default function ConversionFunnel({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-[280px] bg-gray-50 rounded-lg" />
      </div>
    )
  }

  const filteredData = (data || []).filter((d) => d.value > 0)

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
      <h3 className="text-base font-semibold text-[#333333] mb-4">
        Funnel de conversión
      </h3>
      {filteredData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-[#6B7280]">
          Sin datos para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={filteredData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 11, fill: '#333333' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
              {filteredData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
