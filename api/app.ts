/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import zonesRoutes from './routes/zones.js'
import fryReleaseRoutes from './routes/fryRelease.js'
import waterQualityRoutes from './routes/waterQuality.js'
import warningsRoutes from './routes/warnings.js'
import feedingRoutes from './routes/feeding.js'
import harvestRoutes from './routes/harvest.js'
import traceabilityRoutes from './routes/traceability.js'
import financeRoutes from './routes/finance.js'
import messagesRoutes from './routes/messages.js'
import usersRoutes from './routes/users.js'
import dashboardRoutes from './routes/dashboard.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/zones', zonesRoutes)
app.use('/api/fry-release', fryReleaseRoutes)
app.use('/api/water-quality', waterQualityRoutes)
app.use('/api/warnings', warningsRoutes)
app.use('/api/feeding', feedingRoutes)
app.use('/api/harvest', harvestRoutes)
app.use('/api/traceability', traceabilityRoutes)
app.use('/api/finance', financeRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/dashboard', dashboardRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
