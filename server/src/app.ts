import { resolve } from 'node:path'
import express from 'express'
import { handleHttpError } from './http'
import { healthRouter } from './modules/health/health.routes'
import { authRouter } from './modules/auth/auth.routes'
import { accountsRouter } from './modules/accounts/accounts.routes'
import { patientsRouter } from './modules/patients/patients.routes'
import { encountersRouter } from './modules/encounters/encounters.routes'
import { medicationsRouter } from './modules/medications/medications.routes'
import { ruleStatusRouter } from './modules/drug-safety/rule-status.routes'

export const app = express()

app.use((_request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*')
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  if (_request.method === 'OPTIONS') {
    return response.sendStatus(204)
  }
  next()
})

app.use(express.json({ limit: '64kb' }))
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/accounts', accountsRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/patients/:patientId/encounters', encountersRouter)
app.use('/api/medications', medicationsRouter)
app.use('/api/rules', ruleStatusRouter)
app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'Không tìm thấy chức năng API.' })
})
app.use(express.static(resolve(__dirname, '../../client/dist')))
app.use((request, response, next) => {
  if (request.method === 'GET' && !request.path.startsWith('/api')) {
    return response.sendFile(resolve(__dirname, '../../client/dist/index.html'))
  }
  next()
})
app.use(handleHttpError)
