import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Kanban,
  Mail,
  MessageCircle,
  Magnet,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { getInitials } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/prospects', icon: Users, label: 'Prospectos' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/emails', icon: Mail, label: 'Correos' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/lead-magnets', icon: Magnet, label: 'Lead Magnets' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

const adminItems = [
  { to: '/admin', icon: Shield, label: 'Administración' },
]

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const { profile, isAdmin, signOut } = useAuthContext()

  const linkClasses = ({ isActive }) => {
    const base = 'group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium relative'
    if (isActive) {
      return `${base} bg-[#39A1C9] text-white shadow-md shadow-[#39A1C9]/30`
    }
    return `${base} text-gray-400 hover:text-white hover:bg-white/8`
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-64'
      } bg-[#333333] min-h-screen flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out`}
    >
      {/* Logo header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between min-h-[68px]">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src="/maat-logo.png" alt="MAAT" className="w-9 h-9 shrink-0 drop-shadow-md" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                MAAT <span className="text-[#EBA055]">CRM</span>
              </h1>
              <p className="text-[10px] text-gray-500 leading-tight">Gestión Comercial</p>
            </div>
          </div>
        )}

        {collapsed && (
          <img src="/maat-logo.png" alt="MAAT" className="w-9 h-9 mx-auto drop-shadow-md" />
        )}

        <button
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-white transition-colors duration-200 p-1 rounded-md hover:bg-white/10 hidden lg:flex"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold px-4 mb-2 mt-1">
            Menú principal
          </p>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={linkClasses}
            end={item.end}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="border-t border-white/10 my-3" />
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold px-4 mb-2">
                Admin
              </p>
            )}
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClasses}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-white/10">
        {!collapsed ? (
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#39A1C9] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
                {getInitials(profile?.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {profile?.full_name}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#39A1C9]/50 text-blue-300">
                {profile?.role === 'admin' ? 'Administrador' : 'Asesor'}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-gray-500 hover:text-[#EBA055] transition-colors duration-200 text-xs"
                title="Cerrar sesión"
              >
                <LogOut size={14} />
                Salir
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-full bg-[#39A1C9] flex items-center justify-center text-white text-sm font-bold cursor-default shadow-md"
              title={profile?.full_name}
            >
              {getInitials(profile?.full_name)}
            </div>
            <button
              onClick={signOut}
              className="text-gray-500 hover:text-[#EBA055] transition-colors duration-200 p-1.5 rounded-md hover:bg-white/10"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
