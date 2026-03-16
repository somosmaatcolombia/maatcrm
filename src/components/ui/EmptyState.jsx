export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && (
        <div className="relative mb-5">
          {/* Decorative rings */}
          <div className="absolute inset-0 w-20 h-20 -top-2 -left-2 bg-gray-100/50 rounded-2xl rotate-6" />
          <div className="absolute inset-0 w-20 h-20 -top-1 -left-1 bg-gray-100/80 rounded-2xl rotate-3" />
          <div className="relative w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Icon size={28} className="text-[#6B7280]" />
          </div>
        </div>
      )}
      <h3 className="text-base font-semibold text-[#333333] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#6B7280] text-center max-w-sm mb-5">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
