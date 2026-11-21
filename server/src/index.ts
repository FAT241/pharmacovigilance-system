import { createServer } from 'node:http'
import { attachRuleNotifications } from './modules/drug-safety/rule-events'
import { app } from './app'

const server = createServer(app)
attachRuleNotifications(server)

const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT) || 3000

server.listen(port, host, () => {
  console.log(`API listening on http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`)
  console.log(`LAN / Network access: http://<Host-IP>:${port}`)
})
