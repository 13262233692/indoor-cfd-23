import { useCFDStore } from '../../store/cfdStore';
import type { CFDResult } from '../../../shared/types.js';

interface ParamsPanelProps {
  result: CFDResult | null;
}

export function ParamsPanel({ result }: ParamsPanelProps) {
  const {
    params,
    setParams,
    gridSize,
    setGridSize,
    showConcentration,
    setShowConcentration,
    showArrows,
    setShowArrows,
    showHeatmap,
    setShowHeatmap,
    showParticles,
    setShowParticles,
    arrowScale,
    setArrowScale,
    heatmapOpacity,
    setHeatmapOpacity,
  } = useCFDStore();

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>参数设置</h3>

      <div className="space-y-2">
        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>几何设置</label>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>网格大小</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{gridSize}px</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
          className="w-full h-1.5 rounded cursor-pointer"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>

      <div className="h-px" style={{ background: 'var(--border)' }} />

      <div className="space-y-2">
        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>边界条件</label>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>入口风速 (m/s)</span>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={params.inletVelocity}
            onChange={(e) => setParams({ inletVelocity: Number(e.target.value) })}
            className="w-20 px-2 py-1 text-xs rounded bg-transparent border text-right"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>运动粘度 (m²/s)</span>
          <input
            type="number"
            min="1e-6"
            max="1e-3"
            step="1e-6"
            value={params.kinematicViscosity}
            onChange={(e) => setParams({ kinematicViscosity: Number(e.target.value) })}
            className="w-20 px-2 py-1 text-xs rounded bg-transparent border text-right"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="h-px" style={{ background: 'var(--border)' }} />

      <div className="space-y-2">
        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>求解参数</label>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>迭代步数</span>
          <input
            type="number"
            min="50"
            max="2000"
            step="50"
            value={params.timeSteps}
            onChange={(e) => setParams({ timeSteps: Number(e.target.value) })}
            className="w-20 px-2 py-1 text-xs rounded bg-transparent border text-right"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>松弛因子</span>
          <input
            type="number"
            min="0.5"
            max="2"
            step="0.1"
            value={params.relaxFactor}
            onChange={(e) => setParams({ relaxFactor: Number(e.target.value) })}
            className="w-20 px-2 py-1 text-xs rounded bg-transparent border text-right"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>计算浓度场</span>
          <button
            onClick={() => setShowConcentration(!showConcentration)}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ background: showConcentration ? 'var(--accent)' : 'var(--border)' }}
          >
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: showConcentration ? '22px' : '2px' }} />
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <div className="space-y-2">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>显示设置</label>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>速度箭头</span>
              <button
                onClick={() => setShowArrows(!showArrows)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: showArrows ? 'var(--accent)' : 'var(--border)' }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: showArrows ? '22px' : '2px' }} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>热力图</span>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: showHeatmap ? 'var(--accent)' : 'var(--border)' }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: showHeatmap ? '22px' : '2px' }} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>粒子追踪</span>
              <button
                onClick={() => setShowParticles(!showParticles)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: showParticles ? 'var(--accent)' : 'var(--border)' }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: showParticles ? '22px' : '2px' }} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>箭头缩放</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{arrowScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={arrowScale}
              onChange={(e) => setArrowScale(Number(e.target.value))}
              className="w-full h-1.5 rounded cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>热力图透明度</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{Math.round(heatmapOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
              className="w-full h-1.5 rounded cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
