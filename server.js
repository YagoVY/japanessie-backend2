require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import routes
const webhookRoutes = require('./routes/webhooks');
const printWebhookRoutes = require('./routes/print-webhooks');
const realCoordinatesRoutes = require('./routes/real-coordinates-webhook');
const simplePrintUploadRoutes = require('./routes/simple-print-upload');
const orderRoutes = require('./routes/orders');
const debugRoutes = require('./routes/debug');

// Import services
const OrderProcessor = require('./services/order-processor');

// Import utilities
const logger = require('./utils/logger');

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
});

const app = express();

// Railway requires using process.env.PORT with NO fallback
const PORT = process.env.PORT;

if (!PORT) {
  logger.error('PORT environment variable not set!');
  process.exit(1);
}

// Railway-specific configuration
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
if (isRailway) {
  logger.info('Running on Railway platform', {
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
    railwayProjectId: process.env.RAILWAY_PROJECT_ID
  });
}

// Trust proxy for proper IP address handling
const isProd = process.env.NODE_ENV === 'production';

// Railway and proxy configuration
if (isRailway) {
  // Railway uses a proxy, so trust the first proxy hop
  app.set('trust proxy', 1);
} else {
  // If Shopify/your proxy adds X-Forwarded-For, Express must trust the proxy hop.
  app.set('trust proxy', 1); // set to 1 even in dev since we're seeing XFF
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  (isRailway ? ['*'] : '*');

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Hmac-Sha256', 'X-Shopify-Shop-Domain']
}));

// Rate limiting - adjusted for Railway
const limiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: isRailway ? 100 : 300, // Lower limit for Railway hobby plan
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true // match app.set('trust proxy', 1)
});

app.use(limiter);

// --- BEGIN: Webhook raw-body pipeline (Shopify) ---
// Note: Raw body parser will be mounted with the webhook routes below
const webhookRaw = express.raw({ type: 'application/json', limit: '2mb' });

// Middleware to convert raw buffer to JSON object for webhook handlers
const webhookBodyParser = (req, res, next) => {
  // If HMAC is disabled, we still need a JS object for our handlers
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).send('Invalid JSON body');
    }
  }
  next();
};
// --- END: Webhook raw-body pipeline ---

// Global parsers for non-webhook routes
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    shop: req.get('X-Shopify-Shop-Domain')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
// Mount webhooks WITHOUT raw body parser (will be applied per-route in routes/webhooks.js)
app.use('/webhooks', webhookRoutes);  // Legacy webhook routes
logger.info('Legacy webhooks route registered');

app.use('/print-webhooks', printWebhookRoutes);  // New print webhook routes
logger.info('Print webhooks route registered');


app.use('/real-coordinates', realCoordinatesRoutes);  // Real coordinates from frontend
app.use('/simple-print-upload', simplePrintUploadRoutes);  // Simple frontend print file upload
app.use('/api/orders', orderRoutes);
app.use('/api/debug', debugRoutes);

logger.info('All routes registered successfully');

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'T-Shirt Designer Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      webhooks: '/webhooks',
      printWebhooks: '/print-webhooks',
      realCoordinates: '/real-coordinates',
      simplePrintUpload: '/simple-print-upload',
      orders: '/api/orders',
      debug: '/api/debug'
    },
    documentation: 'https://github.com/your-repo/tshirt-designer-backend'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});


// Initialize services
async function initializeServices() {
  try {
    // Initialize order processor
    const orderProcessor = new OrderProcessor();
    logger.info('Order processor initialized');
    
    // Test print generator (disabled for faster startup)
    logger.info('Skipping print generator test for faster startup');
    // const PrintGenerator = require('./services/print-generator');
    // const printGenerator = new PrintGenerator();
    // const testResult = await printGenerator.testRenderer();
    
  } catch (error) {
    logger.error('Service initialization failed:', error);
    // Don't exit - services can be initialized on demand
  }
}

// Start server
async function startServer() {
  try {
    // Initialize services
    await initializeServices();
    logger.info('Services initialized successfully');
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'production',
        port: PORT,
        nodeVersion: process.version,
        host: '0.0.0.0'
      });
    });
    
    server.on('error', (err) => {
      logger.error('Server error:', err);
      process.exit(1);
    });

    // Keep the process alive
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();