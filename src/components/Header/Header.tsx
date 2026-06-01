import { Wind } from 'lucide-react'

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 h-10 shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <Wind size={20} style={{ color: 'var(--accent-primary)' }} />
        <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          室内CFD仿真
        </h1>
      </div>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Lattice Boltzmann Method
      </span>
    </header>
  )
}
