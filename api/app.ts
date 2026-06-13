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
import archiveRoutes from './routes/archives.js'
import borrowRoutes from './routes/borrows.js'
import environmentRoutes from './routes/environment.js'
import equipmentRoutes from './routes/equipment.js'
import statisticsRoutes from './routes/statistics.js'
import warehouseRoutes from './routes/warehouses.js'
import { seedDatabase } from './seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

seedDatabase()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/archives', archiveRoutes)
app.use('/api/borrows', borrowRoutes)
app.use('/api/environment', environmentRoutes)
app.use('/api/equipment', equipmentRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/warehouses', warehouseRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
