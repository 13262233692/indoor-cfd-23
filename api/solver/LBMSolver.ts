import { spawn, type ChildProcess } from 'child_process'
import * as path from 'path'
import type { Geometry, SolverParams, CFDResult } from '../../shared/types.js'

export interface SolverProgress {
  type: 'progress' | 'result' | 'error'
  progress?: number
  result?: CFDResult
  data?: CFDResult
  error?: string
}

const SOLVER_TIMEOUT_MS = 5 * 60 * 1000

function detectPython(): string {
  return 'python'
}

export class LBMSolver {
  private pythonPath: string
  private solverScript: string

  constructor() {
    this.pythonPath = detectPython()
    this.solverScript = path.resolve(process.cwd(), 'python_solver', 'main.py')
  }

  async run(
    geometry: Geometry,
    params: SolverParams,
    onProgress?: (progress: number) => void
  ): Promise<CFDResult> {
    return new Promise((resolve, reject) => {
      let proc: ChildProcess
      try {
        proc = spawn(this.pythonPath, [this.solverScript], {
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      } catch (err) {
        reject(new Error(`无法启动求解器: ${err instanceof Error ? err.message : String(err)}`))
        return
      }

      let resolved = false
      const timer = setTimeout(() => {
        if (resolved) return
        resolved = true
        proc.kill('SIGKILL')
        reject(new Error('求解器运行超时'))
      }, SOLVER_TIMEOUT_MS)

      const inputData = JSON.stringify({ geometry, params })
      proc.stdin!.write(inputData)
      proc.stdin!.end()

      let result: CFDResult | null = null
      let errorMsg = ''
      let stdoutBuf = ''

      proc.stdout!.on('data', (data: Buffer) => {
        if (resolved) return
        stdoutBuf += data.toString()
        const lines = stdoutBuf.split('\n')
        stdoutBuf = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const parsed: SolverProgress = JSON.parse(trimmed)

            if (parsed.type === 'progress' && parsed.progress !== undefined) {
              onProgress?.(parsed.progress)
            } else if (parsed.type === 'result' && parsed.data) {
              result = parsed.data
            } else if (parsed.type === 'error' && parsed.error) {
              errorMsg = parsed.error
            }
          } catch {
            // not JSON, ignore
          }
        }
      })

      let stderrBuf = ''
      proc.stderr!.on('data', (data: Buffer) => {
        stderrBuf += data.toString()
      })

      proc.on('close', (code) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)

        if (code === 0 && result) {
          const maxVel = Math.max(...result.velocity.flat().filter(v => isFinite(v)))
          if (maxVel < 1e-10 && params.inletVelocity > 0) {
            reject(new Error(
              '计算结果异常：速度场全为零。可能原因：送风口未正确匹配到边界，' +
              '请检查风口是否放置在房间边界上。'
            ))
            return
          }
          resolve(result)
        } else {
          let errDetail = ''
          if (errorMsg) {
            errDetail = errorMsg
          } else if (stderrBuf.trim()) {
            const stderrLines = stderrBuf.trim().split('\n')
            errDetail = stderrLines.slice(-5).join('\n')
          } else if (result === null && !errorMsg) {
            errDetail = '求解器未输出任何结果。可能原因：Python环境异常或网格生成失败。'
          } else {
            errDetail = `求解器异常退出(代码${code})`
          }
          reject(new Error(errDetail))
        }
      })

      proc.on('error', (err) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        reject(new Error(`求解器进程错误: ${err.message}`))
      })
    })
  }
}

export const lbmSolver = new LBMSolver()
