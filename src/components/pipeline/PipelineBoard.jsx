import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import PipelineColumn from './PipelineColumn'
import DragDropCard from './DragDropCard'
import { showSuccess, showError } from '../ui/Toast'

export default function PipelineBoard({ stages, prospects, onMoveProspect }) {
  const [activeProspect, setActiveProspect] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  // Group prospects by pipeline_stage
  const prospectsByStage = useMemo(() => {
    const grouped = {}
    stages.forEach((stage) => {
      grouped[stage.slug] = []
    })
    prospects.forEach((prospect) => {
      if (grouped[prospect.pipeline_stage]) {
        grouped[prospect.pipeline_stage].push(prospect)
      }
    })
    return grouped
  }, [stages, prospects])

  function handleDragStart(event) {
    const { active } = event
    const prospect = prospects.find((p) => p.id === active.id)
    if (prospect) {
      setActiveProspect(prospect)
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveProspect(null)

    if (!over) return

    const prospect = prospects.find((p) => p.id === active.id)
    if (!prospect) return

    // Determine target stage
    let targetStageSlug = null

    if (over.data?.current?.type === 'column') {
      // Dropped directly on a column
      targetStageSlug = over.data.current.stage.slug
    } else if (over.data?.current?.type === 'prospect') {
      // Dropped on another prospect — find its column
      const targetProspect = prospects.find((p) => p.id === over.id)
      if (targetProspect) {
        targetStageSlug = targetProspect.pipeline_stage
      }
    } else if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      targetStageSlug = over.id.replace('column-', '')
    }

    if (!targetStageSlug || targetStageSlug === prospect.pipeline_stage) return

    const fromStage = stages.find((s) => s.slug === prospect.pipeline_stage)
    const toStage = stages.find((s) => s.slug === targetStageSlug)

    if (!toStage) return

    onMoveProspect(prospect, targetStageSlug, fromStage, toStage)
  }

  function handleDragCancel() {
    setActiveProspect(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.slug}
            stage={stage}
            prospects={prospectsByStage[stage.slug] || []}
          />
        ))}
      </div>

      {/* Drag overlay — the floating card while dragging */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeProspect ? (
          <div className="w-[280px]">
            <DragDropCard prospect={activeProspect} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
