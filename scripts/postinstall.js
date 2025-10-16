#!/usr/bin/env node

/**
 * Railway Post-install Script
 * Runs after npm install to set up the environment for Railway deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Post-install Setup Starting...');

// Check if we're running on Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;

if (isRailway) {
  console.log('✅ Running on Railway - applying Railway-specific configurations');
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('📁 Created logs directory');
  }
  
  // Verify font files exist
  const fontsDir = path.join(__dirname, '../assets/fonts');
  if (fs.existsSync(fontsDir)) {
    const fontFiles = fs.readdirSync(fontsDir).filter(file => file.endsWith('.ttf'));
    console.log(`🔤 Found ${fontFiles.length} font files`);
  } else {
    console.log('⚠️  Fonts directory not found - ensure fonts are properly deployed');
  }
  
  // Check for required environment variables
  const requiredEnvVars = [
    'PRINTFUL_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.log('⚠️  Missing environment variables:', missingVars.join(', '));
    console.log('   Please set these in your Railway project settings');
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  console.log('🚂 Railway setup complete!');
} else {
  console.log('📝 Not running on Railway - skipping Railway-specific setup');
}

console.log('🎉 Post-install script completed');
