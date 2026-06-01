import { useCFDStore } from '../../store/cfdStore';
import { Play, X, AlertCircle, Loader2, CheckCircle2, Clock } from 'lucide-react';

export default function TaskPanel() {
  const taskStatus = useCFDStore((s) => s.taskStatus);
  const taskProgress = useCFDStore((s) => s.taskProgress);
  const taskError = useCFDStore((s) => s.taskError);
  const submitTask = useCFDStore((s) => s.submitTask);
  const connectWS = useCFDStore((s) => s.connectWS);
  const disconnectWS = useCFDStore((s) => s.disconnectWS);
  const clearError = useCFDStore((s) => s.clearError);
  const roomPoints = useCFDStore((s) => s.roomPoints);
  const result = useCFDStore((s) => s.result);

  const isValid = roomPoints.length >= 3;
  const isRunning = taskStatus === 'queued' || taskStatus === 'running';

  const handleSubmit = async () => {
    connectWS();
    await submitTask();
  };

  const getStatusIcon = () => {
    switch (taskStatus) {
      case 'queued':
        return <Clock size={16} className="animate-pulse" />;
      case 'running':
        return <Loader2 size={16} className="animate-spin" />;
      case 'completed':
        return <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />;
      case 'failed':
        return <AlertCircle size={16} style={{ color: 'var(--error)' }} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (taskStatus) {
      case 'queued':
        return '排队中';
      case 'running':
        return '计算中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (taskStatus) {
      case 'queued':
        return 'var(--warning)';
      case 'running':
        return 'var(--accent-primary)';
      case 'completed':
        return 'var(--success)';
      case 'failed':
        return 'var(--error)';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div
      className="flex flex-col gap-3 p-3 rounded-lg"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <button
        onClick={handleSubmit}
        disabled={!isValid || isRunning}
        className="w-full py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
      >
        <Play size={14} />
        提交计算
      </button>

      {!isValid && (
        <div className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
          需要至少3个顶点才能提交
        </div>
      )}

      {taskStatus && (
        <div className="flex items-center gap-2 text-xs" style={{ color: getStatusColor() }}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      )}

      {taskStatus === 'running' && (
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--border)' }}
        >
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{ width: `${taskProgress}%`, background: 'var(--accent-primary)' }}
          />
        </div>
      )}

      {taskStatus === 'failed' && taskError && (
        <div
          className="text-xs p-2.5 rounded flex items-start gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 break-all">{taskError}</div>
          <button
            onClick={clearError}
            className="p-0.5 hover:opacity-70 flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {taskStatus === 'completed' && result && (
        <div
          className="text-xs p-2.5 rounded flex flex-col gap-1"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          <div className="flex items-center gap-1" style={{ color: 'var(--success)' }}>
            <CheckCircle2 size={12} />
            <span className="font-medium">计算完成</span>
          </div>
          <div>网格: {result.nx} × {result.ny}</div>
          <div>间距: {result.dx.toFixed(4)} m</div>
        </div>
      )}

      {isRunning && (
        <button
          onClick={disconnectWS}
          className="py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--error)' }}
        >
          <X size={12} />
          取消
        </button>
      )}
    </div>
  );
}
