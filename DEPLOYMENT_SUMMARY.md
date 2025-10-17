# Japanessie v2 Backend - Complete System Summary

## 🎯 Overview
This is a Node.js backend service that processes custom Japanese t-shirt designs from Shopify orders and sends them to Printful for printing. The system achieves pixel-perfect consistency between frontend preview and final printed product using server-side canvas rendering with Puppeteer.

## 🏗️ System Architecture

### Core Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Shopify       │    │   Backend API    │    │   Printful      │
│   Store         │───▶│   (This Service) │───▶│   Print Service │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   AWS S3         │
                       │   File Storage   │
                       └──────────────────┘
```

### Key Features
- **Pixel-Perfect Rendering**: Server-side canvas rendering that matches frontend exactly
- **Japanese Font Support**: 5 Google Fonts with proper vertical text handling
- **Multi-Item Orders**: Processes orders with multiple products
- **Static Product Support**: Handles non-personalized products (mugs, etc.)
- **Preset Product Support**: Background images + custom text
- **Real-time Processing**: Asynchronous order processing with status tracking

## 📁 Project Structure

```
Japanessiev2/
├── server.js                 # Main application entry point
├── package.json              # Dependencies and scripts
├── docker-compose.yml        # Docker deployment configuration
├── Dockerfile               # Container build instructions
├── env.example              # Environment variables template
├── routes/                  # API endpoints
│   ├── webhooks.js          # Legacy Shopify webhook handlers
│   ├── print-webhooks.js    # New multi-item webhook system
│   ├── real-coordinates-webhook.js  # Frontend coordinate testing
│   ├── simple-print-upload.js       # Direct file upload endpoint
│   ├── orders.js            # Order management endpoints
│   └── debug.js             # Debug and testing endpoints
├── services/                # Core business logic
│   ├── order-processor.js   # Main order processing orchestrator
│   ├── print-generator.js   # Puppeteer-based print file generation
│   ├── printful-client.js   # Printful API integration
│   ├── s3-storage.js        # AWS S3 file storage
│   ├── order-storage.js     # Order data persistence
│   ├── image-compositor.js  # Background + text composition
│   └── coordinate-scaling-generator.js  # Coordinate transformation
├── config/                  # Configuration files
│   ├── preset-mapping.json  # Shopify → Printful variant mapping
│   ├── non-personalized-products.json  # Static product config
│   ├── preset-backgrounds.json        # Preset image URLs
│   └── print-specs.js       # Print specifications and dimensions
├── assets/                  # Static assets
│   ├── fonts/              # TTF font files (5 Google Fonts)
│   └── fonts-base64.json   # Base64-encoded fonts for browser
├── scripts/                # Utility and setup scripts
│   ├── setup-fonts.js      # Font installation guide
│   ├── get-printful-catalog.js  # Catalog fetching
│   └── [various test scripts]
└── lib/                    # Shared utilities and types
```

## 🔧 Technology Stack

### Core Dependencies
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **Puppeteer** - Headless browser for canvas rendering
- **AWS SDK v3** - S3 storage integration
- **Axios** - HTTP client for API calls
- **Sharp** - Image processing
- **Winston** - Structured logging

### Key Libraries
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection
- **Multer** - File upload handling
- **Joi/Zod** - Input validation

## 🚀 Deployment Instructions

### 1. Environment Setup

Create `.env` file from `env.example`:
```bash
# Printful API Configuration
PRINTFUL_API_KEY=your_printful_api_key_here
PRINTFUL_STORE_ID=your_printful_store_id

# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
S3_BUCKET_NAME=japanessie-designs

# Shopify Webhook Configuration
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret_here
SHOPIFY_STORE_URL=yourstore.myshopify.com

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. Font Setup
Run the font setup script to verify Google Fonts are installed:
```bash
node scripts/setup-fonts.js
```

Required fonts (must be in `assets/fonts/`):
- `yuji-syuku.ttf`
- `shippori-antique.ttf`
- `huninn.ttf`
- `rampart-one.ttf`
- `cherry-bomb-one.ttf`

### 3. Docker Deployment (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t japanessie-backend .
docker run -p 3000:3000 --env-file .env japanessie-backend
```

### 4. Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Start the server
npm start

# For development
npm run dev
```

## 📡 API Endpoints

### Webhook Endpoints
- `POST /webhooks/shopify/orders/created` - Legacy webhook (redirects to new system)
- `POST /print-webhooks/shopify/orders/created` - **Primary webhook** for new orders
- `POST /print-webhooks/shopify/orders/paid` - Process paid orders

### Testing Endpoints
- `POST /print-webhooks/test-print` - Test print generation
- `GET /print-webhooks/test-renderer` - Test renderer functionality
- `POST /real-coordinates/test-real-coordinates` - Test with frontend coordinates
- `POST /simple-print-upload/upload-print-file` - Upload frontend-generated files

### Management Endpoints
- `GET /print-webhooks/orders/:orderId/status` - Get order status
- `GET /print-webhooks/orders` - List recent orders
- `GET /print-webhooks/health` - Health check
- `GET /health` - Basic health check

### Debug Endpoints
- `GET /api/debug/system-info` - System information
- `GET /api/debug/test-fonts` - Font loading test
- `POST /api/debug/test-render` - Test rendering with sample data

## 🔄 Order Processing Flow

### 1. Webhook Reception
```
Shopify Order → Webhook → Extract Design Data → Queue Processing
```

### 2. Design Data Extraction
The system extracts design parameters from order line items:
- `_design_params` - New system (JSON object with all parameters)
- `_layout_snapshot_v2` - Legacy system
- Individual properties - Fallback

### 3. Product Type Detection
- **Custom Products**: Generate print files from text + coordinates
- **Preset Products**: Background image + custom text overlay
- **Static Products**: No print generation (mugs, etc.) - direct to Printful

### 4. Print File Generation
```
Design Params → Puppeteer → Canvas Rendering → PNG Buffer → S3 Upload
```

### 5. Printful Integration
```
Print File → S3 URL → Printful Order Creation → Fulfillment
```

## 🎨 Print Generation Details

### Coordinate System
- **Frontend Canvas**: 600x600px at 72 DPI
- **Print Output**: 3600x4800px at 300 DPI (12"x16" print area)
- **Scale Factor**: 8x scaling for pixel-perfect reproduction

### Font Support
- **Yuji Syuku** - Japanese calligraphy
- **Shippori Antique** - Japanese antique style
- **Huninn** - Japanese handwriting
- **Rampart One** - Japanese display
- **Cherry Bomb One** - Japanese playful

### Text Rendering Features
- Horizontal and vertical text orientation
- Proper letter spacing and line height
- Hyphen replacement for vertical text (ー → ｜)
- Color support (hex, rgb, rgba)
- Font size scaling (12-100px)

## 📊 Configuration Files

### `config/preset-mapping.json`
Maps Shopify variant IDs to Printful variant IDs:
```json
{
  "shopify_to_printful_variants": {
    "52564464435540": 4016,  // Shopify ID → Printful ID
    "52564464435541": 4017
  },
  "preset_fallbacks": {
    "ja-panda-horizontal": 4016,  // Preset ID → Fallback variant
    "wave-vertical": 4016
  }
}
```

### `config/non-personalized-products.json`
Configuration for static products (mugs, etc.):
```json
{
  "staticProductTypes": ["Mugs", "Mug"],
  "productMapping": {
    "Mugs": {
      "productType": "PRESET_IMAGE",
      "description": "Static products synced with Printful"
    }
  }
}
```

### `config/print-specs.js`
Print specifications and dimensions:
```javascript
const PRINT_SPECS = {
  PRINT_AREA: { WIDTH_INCHES: 12, HEIGHT_INCHES: 16, DPI: 300 },
  CANVAS: { WIDTH: 600, HEIGHT: 600, DPI: 72 },
  FONTS: {
    AVAILABLE: ['Yuji Syuku', 'Shippori Antique', 'Huninn', 'Rampart One', 'Cherry Bomb One'],
    DEFAULT: 'Yuji Syuku'
  }
}
```

## 🔍 Monitoring and Debugging

### Health Checks
- `GET /health` - Basic server health
- `GET /print-webhooks/health` - Detailed service health (S3, Printful, etc.)

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking with context
- Performance metrics

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## 🛠️ Troubleshooting

### Common Issues

1. **Font Loading Failures**
   - Verify fonts are in `assets/fonts/` directory
   - Check `assets/fonts-base64.json` exists
   - Run `node scripts/setup-fonts.js`

2. **S3 Upload Errors**
   - Verify AWS credentials in `.env`
   - Check S3 bucket exists and has proper permissions
   - Ensure bucket is in correct region

3. **Printful Integration Issues**
   - Verify `PRINTFUL_API_KEY` and `PRINTFUL_STORE_ID`
   - Check variant mappings in `config/preset-mapping.json`
   - Test with `node scripts/get-printful-catalog.js`

4. **Webhook Processing Failures**
   - Check webhook URL is accessible from Shopify
   - Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify configuration
   - Review logs for specific error messages

### Testing Commands
```bash
# Test font loading
curl http://localhost:3000/api/debug/test-fonts

# Test print generation
curl -X POST http://localhost:3000/print-webhooks/test-print \
  -H "Content-Type: application/json" \
  -d '{"designParams": {"text": "テスト", "fontFamily": "Yuji Syuku"}}'

# Test renderer
curl http://localhost:3000/print-webhooks/test-renderer

# Health check
curl http://localhost:3000/health
```

## 🔒 Security Considerations

- Webhook signature verification (configurable)
- Rate limiting on all endpoints
- CORS configuration for allowed origins
- Helmet security headers
- Input validation and sanitization
- Environment variable protection

## 📈 Performance Optimization

- Puppeteer browser reuse (when possible)
- S3 presigned URLs for file access
- Asynchronous order processing
- Connection pooling for external APIs
- Structured logging for monitoring

## 🚀 Scaling Considerations

- Horizontal scaling with load balancers
- Redis for session storage (if needed)
- CloudFront for S3 file delivery
- Database connection pooling
- Queue system for high-volume processing

## 📝 Key Files for Server Deployment

1. **server.js** - Main application
2. **package.json** - Dependencies
3. **docker-compose.yml** - Container orchestration
4. **Dockerfile** - Container build
5. **.env** - Environment configuration
6. **config/** - All configuration files
7. **assets/fonts/** - Required font files
8. **routes/print-webhooks.js** - Primary webhook handler

This system is production-ready and handles the complete flow from Shopify order to Printful fulfillment with pixel-perfect print file generation.
