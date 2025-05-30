import express, { NextFunction, Request, Response, ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { emailRouter } from './routes/email';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Security middleware
app.use(helmet());
// Replace the existing cors middleware configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
    
    logger.info('CORS Request', {
      requestOrigin: origin,
      allowedOrigins,
      corsOrigin
    });

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Configure rate limiting from environment variables
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes default
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests default

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Body parser with size limit
app.use(express.json({ 
  limit: '1mb',
  verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(400);
      res.end(JSON.stringify({ 
        success: false,
        message: 'Invalid JSON payload'
      }));
      throw new Error('Invalid JSON');
    }
  }
}));

// Health check endpoint
app.get('/health', (_: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/debug/cors', (req: Request, res: Response) => {
  res.json({
    allowedOrigins: corsOrigin.split(','),
    requestOrigin: req.headers.origin,
    headers: req.headers,
    env: {
      corsOrigin,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

app.use('/api/email', emailRouter);

// Custom error types
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', { 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    res.status(400).json({
      success: false,
      message: err.message
    });
    return;
  }

  if (err instanceof RateLimitError) {
    res.status(429).json({
      success: false,
      message: err.message
    });
    return;
  }

  // Generic error response
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

app.use(errorHandler);

// Handle 404
app.use((req: Request, res: Response) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method
  });
  
  res.status(404).json({
    success: false,
    message: 'Not Found'
  });
});

// Handle uncaught exceptions and rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', { 
    error: reason.message,
    stack: reason.stack
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { 
    error: error.message,
    stack: error.stack
  });
  
  // Gracefully shutdown after uncaught exception
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Start server
app.listen(port, () => {
  logger.info(`Email service running on port ${port}`, {
    nodeEnv: process.env.NODE_ENV,
    corsOrigin,
    rateLimitWindowMs,
    rateLimitMaxRequests
  });
});