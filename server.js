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

// CRITICAL: Add error handlers to catch silent crashes
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error('❌ Stack:', err.stack);
  console.error('❌ This will crash the process - Railway will restart');
  // Don't exit immediately, let Railway handle the restart
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  console.error('❌ Promise:', promise);
  console.error('❌ This might crash the process');
});

// Add keepalive ping to show if process is still alive
setInterval(() => {
  console.log('💓 Keepalive:', new Date().toISOString());
}, 30000);

const app = express();

// Add request logging middleware at the TOP (before any routes)
app.use((req, res, next) => {
  console.log(`📨 Incoming: ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Railway requires using process.env.PORT with NO fallback
const PORT = process.env.PORT;

if (!PORT) {
  console.error('❌ PORT environment variable not set! Railway requires this.');
  process.exit(1);
}

// Railway expects the server to bind to the PORT environment variable
console.log('🔧 Server configuration:', {
  PORT: PORT,
  NODE_ENV: process.env.NODE_ENV || 'production',
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
  RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
  ALL_ENV_VARS: {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID
  }
});

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
console.log('🔧 Registering routes...');
console.log('🔧 webhookRoutes type:', typeof webhookRoutes);
console.log('🔧 webhookRoutes keys:', Object.keys(webhookRoutes || {}));
console.log('🔧 printWebhookRoutes type:', typeof printWebhookRoutes);
console.log('🔧 printWebhookRoutes keys:', Object.keys(printWebhookRoutes || {}));

// Mount webhooks WITHOUT raw body parser (will be applied per-route in routes/webhooks.js)
app.use('/webhooks', webhookRoutes);  // Legacy webhook routes
console.log('✅ Legacy webhooks route registered');

app.use('/print-webhooks', printWebhookRoutes);  // New print webhook routes
console.log('✅ Print webhooks route registered');

// Add a direct test to verify routes are accessible
app.get('/test-webhooks', (req, res) => {
  res.json({ 
    message: 'Direct route test - server is working',
    routes: {
      legacy: '/webhooks/shopify/orders/created',
      new: '/print-webhooks/shopify/orders/created'
    }
  });
});

// Debug endpoint to see all registered routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ 
    message: 'All registered routes',
    routes: routes,
    totalRoutes: routes.length
  });
});

app.use('/real-coordinates', realCoordinatesRoutes);  // Real coordinates from frontend
app.use('/simple-print-upload', simplePrintUploadRoutes);  // Simple frontend print file upload
app.use('/api/orders', orderRoutes);
app.use('/api/debug', debugRoutes);

console.log('✅ All routes registered successfully');

// COMPLETE EXPRESS ROUTE AUDIT
console.log('\n🔍 ===== COMPLETE EXPRESS ROUTE AUDIT =====');
console.log('Total middleware/routes in stack:', app._router.stack.length);

app._router.stack.forEach((layer, index) => {
  console.log(`\n[${index}] Layer:`, layer.name);
  
  if (layer.route) {
    // Direct route
    console.log('  Type: Direct Route');
    console.log('  Path:', layer.route.path);
    console.log('  Methods:', Object.keys(layer.route.methods));
  } else if (layer.name === 'router') {
    // Mounted router
    console.log('  Type: Mounted Router');
    console.log('  Regexp:', layer.regexp.toString());
    console.log('  Has handle.stack:', !!layer.handle.stack);
    
    if (layer.handle.stack) {
      console.log('  Sub-routes:');
      layer.handle.stack.forEach((sublayer, subindex) => {
        if (sublayer.route) {
          console.log(`    [${subindex}] ${sublayer.route.path} - ${Object.keys(sublayer.route.methods)}`);
        }
      });
    }
  } else {
    // Middleware
    console.log('  Type: Middleware');
  }
});

console.log('\n🔍 ===== END ROUTE AUDIT =====\n');

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

// Catch-all debug route at the VERY END (after all other routes and handlers)
app.all('*', (req, res, next) => {
  console.log('🎯 MAIN APP REQUEST (catch-all):', req.method, req.path);
  console.log('🎯 Request URL:', req.url);
  console.log('🎯 Request headers:', Object.keys(req.headers));
  next();
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
    console.log('🚀 Starting server initialization...');
    
    try {
      // Initialize services
      console.log('🔧 About to initialize services...');
      await initializeServices();
      console.log('✅ Services initialized successfully');
    } catch (initError) {
      console.error('❌ Service initialization failed:', initError);
      console.error('❌ Init error stack:', initError.stack);
      throw initError;
    }
    
    console.log('✅ Services initialized, starting HTTP server...');
    
    console.log('🔍 DEBUG: About to call app.listen()...');
    
    try {
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ SUCCESS: Server actually listening on ${PORT}`);
        console.log('🔍 DEBUG: Server callback executed successfully');
        logger.info(`Server running on port ${PORT}`, {
          environment: process.env.NODE_ENV || 'production',
          port: PORT,
          nodeVersion: process.version,
          host: '0.0.0.0'
        });
        
        // Add post-startup logging to track if something crashes after this
        setTimeout(() => {
          console.log('🔍 DEBUG: 5 seconds after server start - still alive');
        }, 5000);
        
        setTimeout(() => {
          console.log('🔍 DEBUG: 10 seconds after server start - still alive');
        }, 10000);
        
        setTimeout(() => {
          console.log('🔍 DEBUG: 30 seconds after server start - still alive');
        }, 30000);
      });
      
      server.on('error', (err) => {
        console.error('❌ Server error:', err);
        console.error('❌ Server error stack:', err.stack);
        process.exit(1);
      });
      
      console.log('🔍 DEBUG: app.listen() called, waiting for callback...');
      
    } catch (err) {
      console.error('❌ Failed to start server:', err);
      console.error('❌ Error stack:', err.stack);
      process.exit(1);
    }

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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();