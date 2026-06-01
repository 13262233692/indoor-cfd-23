import { useCFDStore } from '../../store/cfdStore';

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 text-right text-xs px-1.5 py-0.5 rounded font-mono"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: 'var(--accent-primary)' }}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-xs font-semibold uppercase tracking-wider mb-2 pb-1"
      style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border)' }}
    >
      {children}
    </h4>
  );
}

export default function ParamPanel() {
  const params = useCFDStore((s) => s.params);
  const setParams = useCFDStore((s) => s.setParams);
  const gridSize = useCFDStore((s) => s.gridSize);
  const setGridSize = useCFDStore((s) => s.setGridSize);
  const showConcentration = useCFDStore((s) => s.showConcentration);
  const roomPoints = useCFDStore((s) => s.roomPoints);
  const vents = useCFDStore((s) => s.vents);

  return (
    <div
      className="flex flex-col gap-4 p-3 rounded-lg overflow-y-auto"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex flex-col gap-2.5 p-2.5 rounded"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <SectionTitle>几何信息</SectionTitle>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>顶点数</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{roomPoints.length}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>风口数</span>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{vents.length}</span>
        </div>
        <SliderField
          label="网格尺寸"
          value={gridSize}
          min={10}
          max={100}
          step={5}
          onChange={setGridSize}
        />
      </div>

      <div
        className="flex flex-col gap-2.5 p-2.5 rounded"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <SectionTitle>边界条件</SectionTitle>
        <SliderField
          label="送风速度 (m/s)"
          value={params.inletVelocity}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => setParams({ inletVelocity: v })}
        />
        <SliderField
          label="回风压力 (Pa)"
          value={params.outletPressure}
          min={0}
          max={100}
          step={1}
          onChange={(v) => setParams({ outletPressure: v })}
        />
      </div>

      <div
        className="flex flex-col gap-2.5 p-2.5 rounded"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <SectionTitle>求解参数</SectionTitle>
        <SliderField
          label="运动粘度 (m²/s)"
          value={params.kinematicViscosity}
          min={0.001}
          max={0.1}
          step={0.001}
          onChange={(v) => setParams({ kinematicViscosity: v })}
        />
        <SliderField
          label="迭代步数"
          value={params.timeSteps}
          min={100}
          max={5000}
          step={100}
          onChange={(v) => setParams({ timeSteps: v })}
        />
        <SliderField
          label="松弛因子"
          value={params.relaxFactor}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={(v) => setParams({ relaxFactor: v })}
        />
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>浓度计算</span>
          <button
            onClick={() => setParams({ withConcentration: !params.withConcentration })}
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{
              background: params.withConcentration ? 'var(--accent-primary)' : 'var(--border)',
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: 'white',
                transform: params.withConcentration ? 'translateX(16px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      </div>

      <div
        className="flex flex-col gap-2.5 p-2.5 rounded"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <SectionTitle>显示设置</SectionTitle>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>浓度场</span>
          <button
            onClick={() => useCFDStore.setState({ showConcentration: !showConcentration })}
            className="relative w-9 h-5 rounded-full transition-colors"
            style={{
              background: showConcentration ? 'var(--accent-primary)' : 'var(--border)',
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
              style={{
                background: 'white',
                transform: showConcentration ? 'translateX(16px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
