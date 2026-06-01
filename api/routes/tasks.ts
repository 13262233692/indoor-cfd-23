import { Router, type Request, type Response } from 'express'
import { taskQueue } from '../taskQueue.js'
import type { SubmitTaskRequest, SubmitTaskResponse, TaskStatusResponse } from '../../shared/types.js'

const router = Router()

router.post('/tasks', (req: Request, res: Response<SubmitTaskResponse>): void => {
  const { geometry, params } = req.body as SubmitTaskRequest

  if (!geometry || !geometry.room || !geometry.room.points || geometry.room.points.length < 3) {
    res.status(400).json({
      taskId: '',
      status: 'failed',
    })
    return
  }

  if (!geometry.vents || geometry.vents.length === 0) {
    res.status(400).json({
      taskId: '',
      status: 'failed',
    })
    return
  }

  const hasSupply = geometry.vents.some((v: { type: string }) => v.type === 'supply')
  const hasReturn = geometry.vents.some((v: { type: string }) => v.type === 'return')

  if (!hasSupply || !hasReturn) {
    res.status(400).json({
      taskId: '',
      status: 'failed',
    })
    return
  }

  const taskId = taskQueue.submit(geometry, params)
  const task = taskQueue.get(taskId)

  res.status(201).json({
    taskId,
    status: task?.status || 'queued',
  })
})

router.get('/tasks', (_req: Request, res: Response): void => {
  const tasks = taskQueue.getAll()
  res.json(tasks)
})

router.get('/tasks/:id', (req: Request, res: Response): void => {
  const { id } = req.params
  const task = taskQueue.get(id)

  if (!task) {
    res.status(404).json({ error: 'Task not found' })
    return
  }

  res.json(task)
})

router.get('/tasks/:id/status', (req: Request, res: Response<TaskStatusResponse>): void => {
  const { id } = req.params
  const task = taskQueue.get(id)

  if (!task) {
    res.status(404).json({
      taskId: id,
      status: 'failed',
      progress: 0,
    })
    return
  }

  res.json({
    taskId: id,
    status: task.status,
    progress: task.progress,
  })
})

export default router
