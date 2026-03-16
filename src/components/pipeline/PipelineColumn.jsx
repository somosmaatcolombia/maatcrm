import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import DragDropCard from './DragDropCard'

export default function PipelineColumn({ stage, prospects }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.slug}`,
    data: {
      type: 'column',
      stage,
    },
  })

  const prospectIds = prospects.map((p) => p.id)

  return (
    <div className="flex flex-col min-w-[280px] max-w-[300px] w-[280px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="text-sm font-semibold text-[#333333] truncate">
          {stage.name}
        </h3>
        <span className="text-[10px] font-medium text-[#6B7280] bg-gray-100 px-1.5 py-0.5 rounded-full ml-auto tabular-nums">
          {prospects.length}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors duration-200 ${
          isOver
            ? 'bg-[#39A1C9]/5 ring-2 ring-[#39A1C9]/20 ring-dashed'
            : 'bg-gray-100/60'
        }`}
      >
        <SortableContext
          items={prospectIds}
          strategy={verticalListSortingStrategy}
        >
          {prospects.map((prospect) => (
            <DragDropCard key={prospect.id} prospect={prospect} />
          ))}
        </SortableContext>

        {prospects.length === 0 && (
          <div className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed transition-colors duration-200 ${
            isOver ? 'border-[#39A1C9]/30 bg-[#39A1C9]/5' : 'border-gray-200'
          }`}>
            <p className="text-xs text-gray-400">Sin prospectos</p>
          </div>
        )}
      </div>

      {/* Column footer: total estimated value */}
      {prospects.length > 0 && (
        <div className="mt-2 px-1">
          <p className="text-[10px] text-[#6B7280]">
            Valor:{' '}
            <span className="font-semibold text-[#333333]">
              ${prospects.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0).toLocaleString('es-MX')}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
