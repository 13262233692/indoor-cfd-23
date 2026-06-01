import { useCFDStore } from '../../store/cfdStore';
import { Play, RotateCcw, X, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';

export function TaskPanel() {
  const {
    taskStatus,
    taskProgress,
    taskError,
    submitTask,
    connectWS,
    disconnectWS,
    clearError,
    roomPoints,
    clearResult,
  } = useCFDStore();

  const isValid = roomPoints.length >= 3;
  const isRunning = taskStatus === 'queued' || taskStatus === 'running';

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
        return '排队中...';
      case 'running':
        return `计算中 ${Math.round(taskProgress)}%`;
      case 'completed':
        return '计算完成';
      case 'failed':
        return '计算失败';
      default:
        return '等待提交';
    }
  };

  const getStatusColor = () => {
    switch (taskStatus) {
      case 'queued':
        return 'var(--warning)';
      case 'running':
        return 'var(--accent)';
      case 'completed':
        return 'var(--success)';
      case 'failed':
        return 'var(--error)';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>任务状态</h3>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: getStatusColor() }}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </div>

      {isRunning && (
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${taskProgress}%`, background: 'var(--accent)' }}
          />
        </div>
      )}

      {taskError && (
        <div className="text-xs p-2 rounded flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium mb-1">计算错误</div>
            <div className="opacity-80">{taskError}</div>
          </div>
          <button
            onClick={clearError}
            className="p-0.5 hover:bg-white/10 rounded"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={submitTask}
          disabled={!isValid || isRunning}
          className="flex-1 py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Play size={14} />
          提交计算
        </button>

        {taskStatus === 'completed' && (
          <button
            onClick={clearResult}
            className="py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <RotateCcw size={14} />
          </button>
        )}

        {isRunning && (
          <button
            onClick={disconnectWS}
            className="py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--error)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {!isValid && (
        <div className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
          需要至少3个顶点才能定义房间形状
        </div>
      )}

      <div className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
        提示：计算时间取决于网格数量和迭代步数
      </div>
    </div>
  );
}
