import { cn } from '../../lib/utils'

const variants = {
  b2c: 'bg-blue-100 text-blue-800',
  b2b: 'bg-purple-100 text-purple-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  default: 'bg-gray-100 text-gray-800',
}

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span
      className={cn(
        'text-xs font-medium px-2.5 py-0.5 rounded-full',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
