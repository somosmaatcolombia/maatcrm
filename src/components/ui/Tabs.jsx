import { cn } from '../../lib/utils'

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px',
            activeTab === tab.value
              ? 'border-[#39A1C9] text-[#39A1C9]'
              : 'border-transparent text-[#6B7280] hover:text-[#333333] hover:border-gray-300'
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
