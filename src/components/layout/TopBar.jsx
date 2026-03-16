import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, Menu, X } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { getInitials, formatDate } from '../../lib/utils'

const pageTitles = {
  '/': 'Dashboard',
  '/prospects': 'Prospectos',
  '/pipeline': 'Pipeline',
  '/emails': 'Correos',
  '/settings': 'Configuración',
  '/admin': 'Administración',
}

export default function TopBar({ onMobileMenuToggle, mobileMenuOpen }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const getTitle = () => {
    if (location.pathname.startsWith('/prospects/')) return 'Detalle de Prospecto'
    return pageTitles[location.pathname] || 'MAAT CRM'
  }

  const getBreadcrumb = () => {
    const path = location.pathname
    if (path === '/') return null
    if (path.startsWith('/prospects/')) {
      return [
        { label: 'Prospectos', to: '/prospects' },
        { label: 'Detalle' },
      ]
    }
    return null
  }

  const breadcrumb = getBreadcrumb()

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/prospects?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchOpen(false)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-gray-400 hover:text-[#333333] transition-colors duration-200 rounded-lg hover:bg-gray-100"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div>
          <h2 className="text-lg font-semibold text-[#333333] leading-tight">
            {getTitle()}
          </h2>

          {/* Breadcrumbs */}
          {breadcrumb && (
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              {breadcrumb.map((crumb, index) => (
                <span key={index} className="flex items-center gap-1.5">
                  {index > 0 && <span>/</span>}
                  {crumb.to ? (
                    <button
                      onClick={() => navigate(crumb.to)}
                      className="hover:text-[#39A1C9] transition-colors duration-200"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-[#333333] font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Date on dashboard */}
          {location.pathname === '/' && (
            <p className="text-xs text-[#6B7280]">
              {formatDate(new Date())}
            </p>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        {searchOpen ? (
          <form onSubmit={handleSearch} className="flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar prospectos..."
              autoFocus
              className="w-56 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#39A1C9] focus:border-transparent outline-none transition-all duration-200"
              onBlur={() => {
                if (!searchQuery) setSearchOpen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                  setSearchOpen(false)
                }
              }}
            />
          </form>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 text-gray-400 hover:text-[#333333] transition-colors duration-200 rounded-lg hover:bg-gray-100"
            title="Buscar (Ctrl+K)"
          >
            <Search size={20} />
          </button>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 text-gray-400 hover:text-[#333333] transition-colors duration-200 rounded-lg hover:bg-gray-100"
          title="Notificaciones"
        >
          <Bell size={20} />
          {/* Notification dot — visible when there are pending items */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EBA055] rounded-full" /> */}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* User quick info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#39A1C9] flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {getInitials(profile?.full_name)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-[#333333] leading-tight">
              {profile?.full_name}
            </p>
            <p className="text-[11px] text-[#6B7280] capitalize leading-tight">
              {profile?.role === 'admin' ? 'Administrador' : 'Asesor'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
