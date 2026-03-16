/**
 * Full-screen loading skeleton used during auth checks and initial loads.
 * Follows MAAT paper cut design with layered animated placeholders.
 */
export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Logo */}
        <div className="w-16 h-16 animate-pulse">
          <img src="/maat-logo.png" alt="MAAT" className="w-full h-full object-contain" />
        </div>

        {/* Text lines */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-36 bg-gray-300 rounded-full animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded-full animate-pulse delay-100" />
        </div>

        {/* Subtle progress bar */}
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#39A1C9] rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  )
}
