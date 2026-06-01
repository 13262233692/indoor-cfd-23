import { useCFDStore } from '../../store/cfdStore'

export function ColorLegend() {
  const result = useCFDStore((s) => s.result)
  const showConcentration = useCFDStore((s) => s.showConcentration)

  if (!result) return null

  const label = showConcentration && result.concentration ? '浓度' : '速度 (m/s)'

  return (
    <div
      className="absolute top-4 right-4 p-2 rounded-lg text-xs"
      style={{ background: 'rgba(26,35,54,0.9)', border: '1px solid var(--border)' }}
    >
      <div className="text-center mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div
        className="legend-gradient w-4 rounded"
        style={{ height: '120px' }}
      />
      <div className="flex flex-col justify-between mt-1" style={{ height: '120px', color: 'var(--text-muted)', fontSize: '10px' }}>
        <span>高</span>
        <span>低</span>
      </div>
    </div>
  )
}
