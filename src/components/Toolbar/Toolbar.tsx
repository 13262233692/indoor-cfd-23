import { useCFDStore } from '../../store/cfdStore'
import { PenTool, Wind, ArrowDownToLine, Eraser, Trash2, MousePointer2, Sparkles } from 'lucide-react'
import type { DrawingTool } from '../../../shared/types'

const tools: { id: DrawingTool; icon: React.ElementType; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: '选择' },
  { id: 'room', icon: PenTool, label: '绘制房间' },
  { id: 'supply', icon: Wind, label: '送风口' },
  { id: 'return', icon: ArrowDownToLine, label: '回风口' },
  { id: 'particle', icon: Sparkles, label: '粒子源' },
  { id: 'erase', icon: Eraser, label: '擦除' },
]

export function Toolbar() {
  const drawingTool = useCFDStore((s) => s.drawingTool)
  const setDrawingTool = useCFDStore((s) => s.setDrawingTool)
  const clearRoom = useCFDStore((s) => s.clearRoom)

  return (
    <div className="panel w-14 flex flex-col items-center py-3 gap-1.5 h-full">
      {tools.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setDrawingTool(id)}
          className={`tool-btn w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] ${
            drawingTool === id
              ? 'active'
              : ''
          }`}
          style={drawingTool !== id ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}
          title={label}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}

      <div className="w-8 h-px my-1" style={{ background: 'var(--border)' }} />

      <button
        onClick={clearRoom}
        className="tool-btn w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[10px]"
        style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--error)' }}
        title="清空"
      >
        <Trash2 size={16} />
        <span>清空</span>
      </button>
    </div>
  )
}
