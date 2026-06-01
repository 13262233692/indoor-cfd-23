import { useCFDStore } from '../../store/cfdStore';
import { Play, Pause, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function AnimationControls() {
  const {
    result,
    particleSources,
    particles,
    animation,
    toggleAnimation,
    setAnimationSpeed,
    resetAnimation,
    clearParticleSources,
    removeParticleSource,
    setAnimationShowTrails,
    setAnimationTrailLength,
  } = useCFDStore();

  const [expanded, setExpanded] = useState(true);

  if (!result) return null;

  const timePercent = animation.maxTime > 0 ? (animation.time / animation.maxTime) * 100 : 0;

  return (
    <div
      className="absolute bottom-16 left-4 right-4 rounded-lg overflow-hidden z-20"
      style={{ background: 'rgba(26, 35, 54, 0.95)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleAnimation(); }}
            className="p-1.5 rounded-md transition-colors"
            style={{ background: animation.playing ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: animation.playing ? '#ef4444' : '#3b82f6' }}
            title={animation.playing ? '暂停' : '播放'}
          >
            {animation.playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            粒子追踪动画
          </span>
        </div>

        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-100"
            style={{ width: `${timePercent}%`, background: 'var(--accent)' }}
          />
        </div>

        <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
          {animation.time.toFixed(1)}s / {animation.maxTime}s
        </span>

        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {particles.length} 粒子
        </span>

        {expanded ? <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronUp size={14} style={{ color: 'var(--text-secondary)' }} />}
      </div>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <div className="h-px" style={{ background: 'var(--border)' }} />

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>速度</span>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={animation.speed}
                onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                className="w-20 h-1 rounded cursor-pointer"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-xs font-mono w-8" style={{ color: 'var(--text-primary)' }}>
                {animation.speed.toFixed(1)}x
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>轨迹</span>
              <button
                onClick={() => setAnimationShowTrails(!animation.showTrails)}
                className="relative w-8 h-4 rounded-full transition-colors"
                style={{ background: animation.showTrails ? 'var(--accent)' : 'var(--border)' }}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                  style={{ left: animation.showTrails ? '16px' : '2px' }}
                />
              </button>
            </div>

            {animation.showTrails && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>尾迹长度</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={animation.trailLength}
                  onChange={(e) => setAnimationTrailLength(Number(e.target.value))}
                  className="w-16 h-1 rounded cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-xs font-mono w-6" style={{ color: 'var(--text-primary)' }}>
                  {animation.trailLength}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={resetAnimation}
                className="p-1 rounded transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-secondary)' }}
                title="重置动画"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={clearParticleSources}
                className="p-1 rounded transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-secondary)' }}
                title="清除粒子源"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {particleSources.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                粒子源 ({particleSources.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {particleSources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                    style={{ background: 'rgba(255,200,50,0.1)', color: '#ffc832', border: '1px solid rgba(255,200,50,0.2)' }}
                  >
                    <span>({src.position.x.toFixed(1)}, {src.position.y.toFixed(1)})</span>
                    <button
                      onClick={() => removeParticleSource(src.id)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {particleSources.length === 0 && (
            <div className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              选择「粒子源」工具后，在画布上点击放置粒子源
            </div>
          )}
        </div>
      )}
    </div>
  );
}
