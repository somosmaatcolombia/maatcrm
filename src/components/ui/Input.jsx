import { cn } from '../../lib/utils'

export default function Input({ label, error, className, ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[#333333]">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200 text-sm',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
