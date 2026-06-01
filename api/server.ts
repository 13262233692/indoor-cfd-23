import app from './app.js'
import { WebSocketServer, WebSocket } from 'ws'
import { taskQueue } from './taskQueue.js'

const PORT = process.env.PORT || 3001

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

const wss = new WebSocketServer({ server, path: '/ws' })
taskQueue.setWebSocketServer(wss)

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected')
  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
