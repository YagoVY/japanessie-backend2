# Railway Deployment Guide for Japanessie v2 Backend

## 🚂 Railway Hobby Plan Optimization

Your Japanessie v2 backend has been optimized for Railway's hobby plan with the following specifications:
- **Memory**: 512MB RAM
- **CPU**: Shared vCPU
- **Storage**: 1GB persistent volume
- **Network**: 100GB/month bandwidth
- **Cost**: $5/month

## 🚀 Quick Deployment Steps

### 1. Connect to Railway
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login to Railway
railway login

# Connect to your project
railway link
```

### 2. Deploy from GitHub
1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `YagoVY/japanessie-backend2`
5. Railway will automatically detect Node.js and deploy

### 3. Set Environment Variables
In Railway dashboard, go to Variables tab and add:

```bash
# Required Environment Variables
NODE_ENV=production
PORT=3000

# Printful Configuration
PRINTFUL_API_KEY=your_printful_api_key
PRINTFUL_STORE_ID=your_printful_store_id

# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=japanessie-designs

# Shopify Configuration
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOPIFY_STORE_URL=yourstore.myshopify.com

# CORS Configuration (optional)
ALLOWED_ORIGINS=https://yourdomain.com,https://yourstore.myshopify.com
```

## 🔧 Railway-Specific Optimizations

### Memory Management
- **Puppeteer optimization**: Reduced memory footprint for 512MB limit
- **Browser args**: Optimized for Railway's container environment
- **Rate limiting**: Reduced to 100 requests/minute for hobby plan

### Performance Tuning
- **Trust proxy**: Configured for Railway's reverse proxy
- **CORS**: Optimized for Railway's network setup
- **Health checks**: Configured for Railway's monitoring

### File Storage
- **Fonts**: Base64 encoded fonts to avoid file system issues
- **Logs**: Configured to work with Railway's ephemeral file system
- **S3**: All file storage uses AWS S3 (no local storage needed)

## 📊 Railway Hobby Plan Limits

### Memory Usage (512MB)
```
Base Node.js app: ~50MB
Puppeteer instance: ~200MB per concurrent order
Font loading: ~50MB
Available for processing: ~200MB
```

**Recommendation**: Process 1-2 orders simultaneously maximum

### CPU Usage
- Shared vCPU is sufficient for your workload
- Puppeteer rendering is CPU-intensive but manageable
- Railway automatically scales based on demand

### Storage (1GB)
- Code and dependencies: ~200MB
- Font files (base64): ~50MB
- Available for logs/temp: ~750MB

### Bandwidth (100GB/month)
```
Per order: ~2MB (print file upload to S3)
200 orders/month: ~400MB
Remaining: 99.6GB for API calls and webhooks
```

## 🛠️ Monitoring and Debugging

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: Deployment history and status

### Health Checks
```bash
# Basic health check
curl https://your-app.railway.app/health

# Detailed service health
curl https://your-app.railway.app/print-webhooks/health
```

### Logging
Railway automatically captures:
- Application logs via Winston
- Puppeteer console output
- Error messages and stack traces
- Performance metrics

## 🚨 Troubleshooting

### Common Issues

1. **Memory Issues**
   ```
   Error: JavaScript heap out of memory
   ```
   **Solution**: Reduce concurrent Puppeteer instances or upgrade plan

2. **Puppeteer Launch Failures**
   ```
   Error: Failed to launch the browser process
   ```
   **Solution**: Verify Puppeteer args are Railway-compatible

3. **Font Loading Issues**
   ```
   Error: Font not found
   ```
   **Solution**: Ensure fonts-base64.json is properly deployed

4. **S3 Upload Failures**
   ```
   Error: AWS credentials not configured
   ```
   **Solution**: Verify environment variables in Railway dashboard

### Performance Optimization

1. **Reduce Memory Usage**
   - Process orders sequentially instead of parallel
   - Close Puppeteer browsers immediately after use
   - Use smaller canvas sizes for testing

2. **Optimize Puppeteer**
   - Use optimized browser args (already configured)
   - Limit concurrent browser instances
   - Reuse browser instances when possible

3. **Monitor Usage**
   - Check Railway dashboard for memory/CPU usage
   - Monitor error rates and response times
   - Set up alerts for critical issues

## 📈 Scaling Considerations

### When to Upgrade
- **Memory**: If you need >2 concurrent orders
- **CPU**: If processing time >30 seconds per order
- **Storage**: If you need persistent file storage
- **Bandwidth**: If you exceed 100GB/month

### Upgrade Path
1. **Hobby** ($5/month) → **Pro** ($20/month)
2. **Pro** → **Team** (custom pricing)
3. **Team** → **Enterprise** (custom pricing)

## 🔗 Railway-Specific URLs

After deployment, Railway provides:
- **App URL**: `https://your-app-name.railway.app`
- **Custom Domain**: Configure in Railway dashboard
- **Webhook URL**: `https://your-app-name.railway.app/print-webhooks/shopify/orders/created`

## ✅ Deployment Checklist

- [ ] Repository connected to Railway
- [ ] Environment variables configured
- [ ] Health check endpoint responding
- [ ] Font files properly loaded
- [ ] S3 credentials working
- [ ] Printful API connected
- [ ] Webhook URL configured in Shopify
- [ ] Test order processing successful

## 🎯 Expected Performance

With Railway Hobby Plan:
- **Startup time**: ~30-60 seconds
- **Order processing**: ~10-15 seconds per order
- **Concurrent orders**: 1-2 maximum
- **Uptime**: 99.9% (Railway SLA)
- **Response time**: <2 seconds for API calls

Your Japanessie v2 backend is now optimized for Railway's hobby plan and ready for production deployment! 🚂✨
