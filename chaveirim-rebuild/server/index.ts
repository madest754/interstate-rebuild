/**
 * Chaveirim Dispatcher - Server Entry Point
 * 
 * This is the main entry point for the Express server.
 * It sets up middleware, authentication, routes, and WebSocket.
 */

import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupAuth } from './auth';
import { registerRoutes } from './routes';
import { setupVite, serveStatic } from './vite';
import { realtimeServer } from './websocket';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Initialize WebSocket server
realtimeServer.init(server);

// Trust proxy for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://api.anthropic.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://www.google.com"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.APP_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Session configuration
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'chaveirim-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Setup Passport authentication
setupAuth(app);

// Health check endpoint (before auth)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: realtimeServer.getConnectionCount(),
  });
});

// Register all API routes
registerRoutes(app);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  realtimeServer.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Setup Vite for development or serve static files for production
(async () => {
  if (process.env.NODE_ENV === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚗 Chaveirim Dispatcher Server                          ║
║                                                           ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(15)}                   ║
║   Port: ${port}                                              ║
║   URL: http://localhost:${port}                              ║
║   WebSocket: ws://localhost:${port}/ws                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
})();

export { app, server, realtimeServer };
