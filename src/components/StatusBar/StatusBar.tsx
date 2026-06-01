import { useCFDStore } from '../../store/cfdStore'

export function StatusBar() {
  const taskStatus = useCFDStore((s) => s.taskStatus)
  const taskProgress = useCFDStore((s) => s.taskProgress)
  const gridSize = useCFDStore((s) => s.gridSize)
  const roomPoints = useCFDStore((s) => s.roomPoints)

  return (
    <footer
      className="flex items-center justify-between px-4 h-7 text-xs shrink-0"
      style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
    >
      <div className="flex items-center gap-4">
        <span>顶点: {roomPoints.length}</span>
        <span>网格: {gridSize}×{Math.round(gridSize * 0.75)}</span>
      </div>
      <div className="flex items-center gap-4">
        {taskStatus && (
          <span>
            {taskStatus === 'running' ? `计算中 ${taskProgress}%` : taskStatus === 'completed' ? '计算完成' : taskStatus === 'failed' ? '计算失败' : '排队中'}
          </span>
        )}
      </div>
    </footer>
  )
}
