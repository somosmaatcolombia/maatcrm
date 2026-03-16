import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-200 hover:shadow-lg">
        <div className="flex items-center gap-3 text-[#6B7280]">
          <Settings size={24} />
          <div>
            <h3 className="text-lg font-semibold text-[#333333]">Configuración</h3>
            <p className="text-sm">Configuración del sistema — próximamente.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
