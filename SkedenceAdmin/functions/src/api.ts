import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { validateApiKey, rateLimit } from './api/middleware/auth';

// Import route modules
import clientsRouter from './api/routes/clients';
import bookingsRouter from './api/routes/bookings';
import trainersRouter from './api/routes/trainers';
import classesRouter from './api/routes/classes';
import reportsRouter from './api/routes/reports';

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true })); // Allow all origins (can be restricted later)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Apply authentication and rate limiting to all API routes
app.use('/api/v1', validateApiKey);
app.use('/api/v1', rateLimit);

// Register route handlers
app.use('/api/v1/clients', clientsRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/trainers', trainersRouter);
app.use('/api/v1/classes', classesRouter);
app.use('/api/v1/reports', reportsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found.`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Export as Cloud Function
export const api = functions.https.onRequest(app);
