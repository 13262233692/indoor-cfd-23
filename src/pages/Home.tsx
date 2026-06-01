import { Header } from '../components/Header/Header'
import { Toolbar } from '../components/Toolbar/Toolbar'
import { DrawingCanvas } from '../components/Canvas/DrawingCanvas'
import { ResultCanvas } from '../components/Canvas/ResultCanvas'
import { ParticleCanvas } from '../components/Canvas/ParticleCanvas'
import { AnimationControls } from '../components/AnimationControls/AnimationControls'
import { ParamsPanel } from '../components/ParamsPanel/ParamsPanel'
import { TaskPanel } from '../components/ParamsPanel/TaskPanel'
import { ColorLegend } from '../components/ColorLegend/ColorLegend'
import { StatusBar } from '../components/StatusBar/StatusBar'
import { useCFDStore } from '../store/cfdStore'

export default function Home() {
  const result = useCFDStore((s) => s.result)
  const showParticles = useCFDStore((s) => s.showParticles)

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Toolbar />

        <div className="flex-1 relative">
          {result ? <ResultCanvas /> : <DrawingCanvas />}
          {result && showParticles && <ParticleCanvas />}
          {result && <AnimationControls />}
          <ColorLegend />

          {!result && (
            <div
              className="absolute bottom-4 left-4 p-3 rounded-lg text-xs max-w-xs"
              style={{ background: 'rgba(26,35,54,0.9)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>操作提示</div>
              <ul className="space-y-0.5">
                <li>• 点击「绘制房间」，在画布上点击添加顶点，双击闭合</li>
                <li>• 选择「送风口/回风口」，在房间边界上点击放置</li>
                <li>• 设置参数后点击「提交计算」</li>
                <li>• 按 ESC 或右键撤销最后一个顶点</li>
              </ul>
            </div>
          )}

          {result && (
            <div
              className="absolute top-4 left-4 p-2 rounded-lg text-xs"
              style={{ background: 'rgba(26,35,54,0.9)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>粒子追踪模式</div>
              <ul className="space-y-0.5">
                <li>• 选择「粒子源」工具，在画布上点击放置粒子源</li>
                <li>• 点击播放按钮启动粒子动画</li>
                <li>• 粒子将沿气流方向运动，颜色反映浓度</li>
              </ul>
            </div>
          )}
        </div>

        <div className="w-64 flex flex-col gap-2 p-2 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
          <ParamsPanel result={result} />
          <TaskPanel />
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
