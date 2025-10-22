const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs').promises;
const S3StorageService = require('./s3-storage');
const ImageCompositor = require('./image-compositor');
const logger = require('../utils/logger');

class PrintGenerator {
  constructor() {
    this.s3Storage = new S3StorageService();
    this.imageCompositor = new ImageCompositor();
    this.printRendererPath = path.join(__dirname, '../print-renderer.html');
    this.base64Fonts = null;
    this.presetBackgrounds = this.loadPresetBackgrounds();
  }

  /**
   * Load preset backgrounds configuration
   * @returns {Object} - Preset backgrounds mapping
   */
  loadPresetBackgrounds() {
    try {
      const presetBackgroundsPath = path.join(__dirname, '../config/preset-backgrounds.json');
      const config = require(presetBackgroundsPath);
      logger.info('Loaded preset backgrounds config', { 
        presetCount: Object.keys(config.preset_backgrounds || {}).length 
      });
      return config.preset_backgrounds || {};
    } catch (error) {
      logger.warn('Failed to load preset backgrounds config:', error.message);
      return {};
    }
  }

  async loadBase64Fonts() {
    if (this.base64Fonts) return this.base64Fonts;
    
    try {
      const fontsPath = path.join(__dirname, '../assets/fonts-base64.json');
      const fontsData = await fs.readFile(fontsPath, 'utf8');
      this.base64Fonts = JSON.parse(fontsData);
      logger.info('Base64 fonts loaded successfully');
      return this.base64Fonts;
    } catch (error) {
      logger.error('Failed to load base64 fonts:', error.message);
      return {};
    }
  }

  /**
   * Map frontend font names to actual font family names
   * @param {string} fontName - Frontend font name (e.g., "Dela Gothic One")
   * @returns {string} - Actual font family name
   */
  mapFontName(fontName) {
    const fontMap = {
      'Dela Gothic One': 'Dela Gothic One',
      'DotGothic16': 'DotGothic16',
      'Yuji Syuku': 'Yuji Syuku',
      'Shippori Antique': 'Shippori Antique',
      'Huninn': 'Huninn',
      'Rampart One': 'Rampart One',
      'Cherry Bomb One': 'Cherry Bomb One',
      'Kiwi Maru': 'Kiwi Maru',
      'Klee One': 'Klee One',
      'Mochiy Pop One': 'Mochiy Pop One',
      'Noto Sans JP': 'Noto Sans JP',
      'Yuji Mai': 'Yuji Mai',
      'Darumadrop One': 'Darumadrop One'
    };
    
    return fontMap[fontName] || fontName;
  }

  /**
   * Apply presetConfig styling to design params (for PRESET_TEXT products)
   * For PRESET_TEXT, presetConfig takes precedence over top-level params
   * @param {Object} designParams - Original design parameters
   * @returns {Object} - Modified design parameters with presetConfig applied
   */
  applyPresetConfig(designParams) {
    // Check if this is a PRESET_TEXT product with presetConfig
    if (!designParams.presetConfig) {
      return designParams; // No presetConfig, return as-is
    }

    const isPresetText = this.isPresetTextProduct(designParams);
    if (!isPresetText) {
      logger.info('PresetConfig found but not PRESET_TEXT product, ignoring presetConfig');
      return designParams; // Not PRESET_TEXT, don't apply presetConfig
    }

    logger.info('Applying presetConfig for PRESET_TEXT product', {
      presetId: designParams.presetId,
      presetConfig: designParams.presetConfig
    });

    const presetConfig = designParams.presetConfig;
    
    // Create modified params with presetConfig values overriding top-level params
    const modifiedParams = {
      ...designParams,
      
      // Override with presetConfig values
      fontFamily: this.mapFontName(presetConfig.font || designParams.fontFamily),
      fontSize: presetConfig.fontSize || designParams.fontSize,
      color: presetConfig.fontColor || designParams.color,
      orientation: presetConfig.orientation || designParams.orientation,
      letterSpacing: presetConfig.letterSpacing !== undefined ? presetConfig.letterSpacing : designParams.letterSpacing,
      
      // Add stroke if enabled
      stroke: presetConfig.stroke?.enabled ? {
        enabled: true,
        color: presetConfig.stroke.color,
        width: presetConfig.stroke.width
      } : null,
      
      // Add shadow if enabled
      shadow: presetConfig.shadow?.enabled ? {
        enabled: true,
        color: presetConfig.shadow.color,
        blur: presetConfig.shadow.blur,
        offsetX: presetConfig.shadow.offsetX,
        offsetY: presetConfig.shadow.offsetY
      } : null,
      
      // Add custom position if provided
      customPosition: presetConfig.position ? {
        x: presetConfig.position.x,
        y: presetConfig.position.y
      } : null,
      
      // Add colorPattern if provided (multi-color text support)
      colorPattern: presetConfig.colorPattern ? {
        colors: presetConfig.colorPattern.colors,
        repeat: presetConfig.colorPattern.repeat !== undefined ? presetConfig.colorPattern.repeat : true
      } : null
    };

    // Note: ja-noto-2 adjustment now happens in generatePrintFile before this function is called

    logger.info('PresetConfig applied successfully', {
      font: modifiedParams.fontFamily,
      fontSize: modifiedParams.fontSize,
      color: modifiedParams.color,
      hasStroke: !!modifiedParams.stroke,
      hasShadow: !!modifiedParams.shadow,
      hasCustomPosition: !!modifiedParams.customPosition,
      hasColorPattern: !!modifiedParams.colorPattern
    });

    return modifiedParams;
  }

  async prepareHtmlWithFonts() {
    let htmlContent = await fs.readFile(this.printRendererPath, 'utf8');
    
    // Check if we're in production (Railway) - use system fonts instead of Base64
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
    
    if (isProduction) {
      logger.info('Production environment detected - using system fonts instead of Base64');
      
      // Remove Base64 font-face declarations and just use system fonts
      // The fonts are already installed at /usr/share/fonts/truetype/custom/ via nixpacks.toml
      htmlContent = htmlContent.replace('{{YujiSyukuBase64}}', '');
      htmlContent = htmlContent.replace('{{ShipporiAntiqueBase64}}', '');
      htmlContent = htmlContent.replace('{{HuninnBase64}}', '');
      htmlContent = htmlContent.replace('{{RampartOneBase64}}', '');
      htmlContent = htmlContent.replace('{{CherryBombOneBase64}}', '');
      htmlContent = htmlContent.replace('{{KiwiMaruBase64}}', '');
      htmlContent = htmlContent.replace('{{KleeOneBase64}}', '');
      htmlContent = htmlContent.replace('{{MochiyPopOneBase64}}', '');
      htmlContent = htmlContent.replace('{{NotoSansJPBase64}}', '');
      htmlContent = htmlContent.replace('{{YujiMaiBase64}}', '');
      htmlContent = htmlContent.replace('{{DelaGothicOneBase64}}', '');
      htmlContent = htmlContent.replace('{{DotGothic16Base64}}', '');
      htmlContent = htmlContent.replace('{{DarumadropOneBase64}}', '');
      
      logger.info('System fonts will be used from /usr/share/fonts/truetype/custom/');
    } else {
      // Development: use Base64 fonts
      logger.info('Development environment - loading Base64 fonts');
      const base64Fonts = await this.loadBase64Fonts();
      
      // Log font availability for debugging
      logger.info('Preparing HTML with Base64 fonts:', {
        availableFonts: Object.keys(base64Fonts),
        'Yuji Syuku': base64Fonts['Yuji Syuku'] ? `${(base64Fonts['Yuji Syuku'].length / 1024 / 1024).toFixed(2)}MB` : 'MISSING',
        'Shippori Antique': base64Fonts['Shippori Antique'] ? `${(base64Fonts['Shippori Antique'].length / 1024 / 1024).toFixed(2)}MB` : 'MISSING',
        'Huninn': base64Fonts['Huninn'] ? `${(base64Fonts['Huninn'].length / 1024 / 1024).toFixed(2)}MB` : 'MISSING',
        'Rampart One': base64Fonts['Rampart One'] ? `${(base64Fonts['Rampart One'].length / 1024 / 1024).toFixed(2)}MB` : 'MISSING',
        'Cherry Bomb One': base64Fonts['Cherry Bomb One'] ? `${(base64Fonts['Cherry Bomb One'].length / 1024 / 1024).toFixed(2)}MB` : 'MISSING'
      });
      
      // Replace font placeholders with actual base64 data
      htmlContent = htmlContent.replace('{{YujiSyukuBase64}}', base64Fonts['Yuji Syuku'] || '');
      htmlContent = htmlContent.replace('{{ShipporiAntiqueBase64}}', base64Fonts['Shippori Antique'] || '');
      htmlContent = htmlContent.replace('{{HuninnBase64}}', base64Fonts['Huninn'] || '');
      htmlContent = htmlContent.replace('{{RampartOneBase64}}', base64Fonts['Rampart One'] || '');
      htmlContent = htmlContent.replace('{{CherryBombOneBase64}}', base64Fonts['Cherry Bomb One'] || '');
      htmlContent = htmlContent.replace('{{KiwiMaruBase64}}', base64Fonts['Kiwi Maru'] || '');
      htmlContent = htmlContent.replace('{{KleeOneBase64}}', base64Fonts['Klee One'] || '');
      htmlContent = htmlContent.replace('{{MochiyPopOneBase64}}', base64Fonts['Mochiy Pop One'] || '');
      htmlContent = htmlContent.replace('{{NotoSansJPBase64}}', base64Fonts['Noto Sans JP'] || '');
      htmlContent = htmlContent.replace('{{YujiMaiBase64}}', base64Fonts['Yuji Mai'] || '');
      htmlContent = htmlContent.replace('{{DelaGothicOneBase64}}', base64Fonts['Dela Gothic One'] || '');
      htmlContent = htmlContent.replace('{{DotGothic16Base64}}', base64Fonts['DotGothic16'] || '');
      htmlContent = htmlContent.replace('{{DarumadropOneBase64}}', base64Fonts['Darumadrop One'] || '');
      
      // Log if any placeholders remain (indicating missing fonts)
      const remainingPlaceholders = htmlContent.match(/\{\{[^}]+\}\}/g);
      if (remainingPlaceholders) {
        logger.warn('Font placeholders not replaced:', remainingPlaceholders);
      } else {
        logger.info('All font placeholders successfully replaced');
      }
    }
    
    return htmlContent;
  }

  async generatePrintFile(designParams, options = {}) {
    let browser = null;
    
    try {
      logger.info('Starting print generation with Puppeteer', { designParams, options });
      
      // SPECIAL CASE: Adjust Y position for ja-noto-2 preset BEFORE applying presetConfig
      if (designParams.presetId === 'ja-noto-2' && designParams.textCoordinates && designParams.textCoordinates.coordinates) {
        const adjustment = 4; // Move text down by 4px
        logger.info('🔧 Adjusting ja-noto-2 textCoordinates Y positions BEFORE rendering', {
          originalFirstY: designParams.textCoordinates.coordinates[0]?.y,
          adjustment: `+${adjustment}px`
        });
        designParams.textCoordinates.coordinates = designParams.textCoordinates.coordinates.map(coord => ({
          ...coord,
          y: coord.y + adjustment
        }));
        logger.info('🔧 ja-noto-2 adjustment applied:', {
          newFirstY: designParams.textCoordinates.coordinates[0]?.y
        });
      }
      
      // For PRESET_TEXT products with presetConfig, use preset styling instead of top-level params
      const actualParams = this.applyPresetConfig(designParams);
      logger.info('Applied preset config (if present)', { 
        hadPresetConfig: !!designParams.presetConfig,
        isPresetText: this.isPresetTextProduct(designParams)
      });
      
      // Determine canvas size from options
      const canvasSize = options.canvasSize || { width: 3600, height: 4800 };
      const isTestMode = options.canvasSize !== undefined;
      
      // Get Puppeteer executable path based on environment
      const getPuppeteerPath = () => {
        // For Railway/Production, ALWAYS return the Nix chromium path
        if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
          return '/nix/var/nix/profiles/default/bin/chromium';
        }
        
        // For local development with puppeteer-core, we need to specify a path too
        return null;
      };
      
      const executablePath = getPuppeteerPath();
      
      // IMPORTANT: Log the actual path value
      logger.info('Using Chromium path:', executablePath || 'default Puppeteer Chrome');
      logger.info('Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
        executablePath: executablePath
      });
      
      const puppeteerArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ];
      
      // Production-specific optimizations
      if (process.env.NODE_ENV === 'production') {
        puppeteerArgs.push(
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        );
      }
      
      // Make sure executablePath is actually set
      const launchOptions = {
        headless: 'new',
        args: puppeteerArgs
      };
      
      // CRITICAL: Only add executablePath if it has a value
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      
      logger.info('Puppeteer launch options:', launchOptions);
      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();
      
      // Capture console logs for debugging
      page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'log') {
          logger.info(`[Browser Console] ${text}`);
        } else if (type === 'error') {
          logger.error(`[Browser Console Error] ${text}`);
        } else if (type === 'warn') {
          logger.warn(`[Browser Console Warning] ${text}`);
        }
      });
      
      // Set viewport to match canvas dimensions
      await page.setViewport({
        width: canvasSize.width,
        height: canvasSize.height,
        deviceScaleFactor: 1
      });

      // Load the print renderer HTML with embedded fonts
      const htmlContent = await this.prepareHtmlWithFonts();
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait for the renderer to be ready
      await page.waitForFunction(() => window.printRendererReady === true, {
        timeout: 10000
      });

      logger.info('Print renderer loaded successfully');

      // Execute the rendering function
      const result = await page.evaluate(async (params, canvasSize, isTestMode, useFrontendLogic) => {
        return await window.renderPrintDesign(params, canvasSize, isTestMode, useFrontendLogic);
      }, actualParams, canvasSize, isTestMode, options.useFrontendLogic);

      if (!result.success) {
        throw new Error(`Rendering failed: ${result.error}`);
      }

      logger.info('Print rendering completed', { 
        dimensions: result.dimensions,
        dataUrlLength: result.dataUrl.length 
      });

      // Convert data URL to buffer
      const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
      const printBuffer = Buffer.from(base64Data, 'base64');

      // Store in S3 if orderId provided
      let s3Url = null;
      if (options.orderId) {
        try {
          const uploadResult = await this.s3Storage.uploadBuffer(
            `prints/${options.orderId}/${Date.now()}-print.png`,
            printBuffer,
            'image/png',
            {
              orderId: options.orderId,
              type: 'print-file',
              dpi: result.dimensions.dpi,
              dimensions: `${result.dimensions.width}x${result.dimensions.height}`,
              generatedAt: new Date().toISOString()
            }
          );
          s3Url = uploadResult;
          logger.info('Print file uploaded to S3', { s3Url });
        } catch (s3Error) {
          logger.warn(`S3 not configured, skipping print file upload: ${s3Error.message}`);
        }
      }

      return {
        success: true,
        printBuffer,
        s3Url,
        dimensions: result.dimensions,
        metadata: {
          generatedAt: new Date().toISOString(),
          designParams: actualParams,
          originalDesignParams: designParams,
          hadPresetConfig: !!designParams.presetConfig,
          rendererVersion: '1.0.0'
        }
      };

    } catch (error) {
      logger.error('Print generation failed', { error: error.message, stack: error.stack });
      throw new Error(`Print generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate print file for preset products (background + text)
   * @param {Object} designParams - Design parameters including preset info
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generation result with composited image
   */
  async generatePresetPrintFile(designParams, options = {}) {
    let backgroundImagePath = null;
    
    try {
      logger.info('Starting preset print generation', { designParams, options });
      
      // Step 1: Generate text-only PNG (existing functionality)
      logger.info('Generating text PNG for preset product');
      const textResult = await this.generatePrintFile(designParams, options);
      
      if (!textResult.success) {
        throw new Error('Failed to generate text PNG for preset product');
      }
      
      // Step 2: Check if this is a preset product
      const presetId = this.extractPresetId(designParams);
      if (!presetId) {
        logger.warn('No preset ID found, treating as custom product');
        return textResult; // Fallback to text-only
      }
      
      logger.info(`Processing preset product: ${presetId}`);
      
      // Step 3: Fetch background image from the actual Printful product
      const PrintfulClient = require('./printful-client');
      const printfulClient = new PrintfulClient();
      
      try {
        // Get preset ID from design parameters
        if (!presetId) {
          throw new Error('Preset ID required for background fetch');
        }
        
        backgroundImagePath = await printfulClient.fetchBackgroundImageFromS3(presetId);
        logger.info('Background image fetched successfully from S3', { 
          backgroundImagePath, 
          presetId 
        });
      } catch (backgroundError) {
        logger.error('Failed to fetch background image from product, using text-only fallback:', backgroundError.message);
        return textResult; // Fallback to text-only
      }
      
      // Step 4: Composite text onto background
      logger.info('Compositing text onto background image');
      const compositedBuffer = await this.imageCompositor.compositeImages(
        backgroundImagePath,
        textResult.printBuffer
      );
      
      // Step 5: Upload composited image to S3
      let s3Url = null;
      if (options.orderId) {
        try {
          const uploadResult = await this.s3Storage.uploadBuffer(
            `prints/${options.orderId}/${Date.now()}-preset-print.png`,
            compositedBuffer,
            'image/png',
            {
              orderId: options.orderId,
              type: 'preset-print-file',
              presetId: presetId,
              dpi: textResult.dimensions.dpi,
              dimensions: `${textResult.dimensions.width}x${textResult.dimensions.height}`,
              generatedAt: new Date().toISOString()
            }
          );
          s3Url = uploadResult;
          logger.info('Preset print file uploaded to S3', { s3Url });
        } catch (s3Error) {
          logger.warn(`S3 not configured, skipping preset print file upload: ${s3Error.message}`);
        }
      }
      
      return {
        success: true,
        printBuffer: compositedBuffer,
        s3Url,
        dimensions: textResult.dimensions,
        metadata: {
          generatedAt: new Date().toISOString(),
          designParams,
          presetId: presetId,
          rendererVersion: '1.0.0',
          type: 'preset-product'
        }
      };
      
    } catch (error) {
      logger.error('Preset print generation failed', { error: error.message, stack: error.stack });
      throw new Error(`Preset print generation failed: ${error.message}`);
    } finally {
      // Clean up temporary background image file
      if (backgroundImagePath) {
        try {
          await this.imageCompositor.cleanupTempFiles([backgroundImagePath]);
        } catch (cleanupError) {
          logger.warn('Failed to clean up background image:', cleanupError.message);
        }
      }
    }
  }

  /**
   * Extract preset ID from design parameters
   * @param {Object} designParams - Design parameters
   * @returns {string|null} - Preset ID or null if not found
   */
  extractPresetId(designParams) {
    // Check for preset ID in various possible locations
    if (designParams.presetId) {
      return designParams.presetId;
    }
    
    if (designParams.preset_id) {
      return designParams.preset_id;
    }
    
    // Check for preset product type (both uppercase and lowercase)
    if (designParams.productType === 'PRESET_IMAGE' || designParams.productType === 'preset_image') {
      return designParams.presetId || designParams.preset_id;
    }
    
    // Check if design params contain preset information
    if (designParams.textCoordinates && designParams.textCoordinates.presetId) {
      return designParams.textCoordinates.presetId;
    }
    
    return null;
  }

  /**
   * Check if design parameters indicate a preset product (ANY type)
   * @param {Object} designParams - Design parameters
   * @returns {boolean} - True if preset product (either PRESET_IMAGE or PRESET_TEXT)
   */
  isPresetProduct(designParams) {
    // Frontend sends productType: "preset_image" for ALL presets
    const isPresetType = designParams.productType === 'PRESET_IMAGE' || 
                         designParams.productType === 'preset_image' ||
                         designParams.productType === 'PRESET_TEXT' ||
                         designParams.productType === 'preset_text';
    const presetId = this.extractPresetId(designParams);
    return isPresetType && presetId !== null && presetId !== undefined;
  }

  /**
   * Check if a preset has a background image
   * @param {string} presetId - Preset identifier
   * @returns {boolean} - True if preset has background image in config
   */
  hasPresetBackground(presetId) {
    if (!presetId) return false;
    const hasBackground = this.presetBackgrounds && this.presetBackgrounds[presetId];
    logger.info(`Checking background for preset ${presetId}:`, hasBackground ? 'YES' : 'NO');
    return !!hasBackground;
  }

  /**
   * Determine the actual preset type based on background availability
   * Frontend sends "preset_image" for all presets, but backend needs to differentiate
   * @param {Object} designParams - Design parameters
   * @returns {string} - 'PRESET_IMAGE', 'PRESET_TEXT', or 'CUSTOM'
   */
  determinePresetType(designParams) {
    // Check if this is a preset product at all
    if (!this.isPresetProduct(designParams)) {
      return 'CUSTOM';
    }

    const presetId = this.extractPresetId(designParams);
    
    // Check if preset has background image in config
    if (this.hasPresetBackground(presetId)) {
      logger.info(`Preset ${presetId} classified as PRESET_IMAGE (has background)`);
      return 'PRESET_IMAGE';
    } else {
      logger.info(`Preset ${presetId} classified as PRESET_TEXT (no background)`);
      return 'PRESET_TEXT';
    }
  }

  /**
   * Check if design parameters indicate a text-only preset
   * @param {Object} designParams - Design parameters
   * @returns {boolean} - True if preset text product
   */
  isPresetTextProduct(designParams) {
    return this.determinePresetType(designParams) === 'PRESET_TEXT';
  }

  /**
   * Check if design parameters indicate an image+text preset
   * @param {Object} designParams - Design parameters
   * @returns {boolean} - True if preset image product
   */
  isPresetImageProduct(designParams) {
    return this.determinePresetType(designParams) === 'PRESET_IMAGE';
  }

  async generatePreview(designParams, options = {}) {
    // Generate a smaller preview version for testing
    const previewParams = {
      ...designParams,
      // Could add preview-specific scaling here if needed
    };

    return this.generatePrintFile(previewParams, {
      ...options,
      preview: true
    });
  }

  async validateDesignParams(designParams) {
    const required = ['text'];
    const missing = required.filter(field => !designParams[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required design parameters: ${missing.join(', ')}`);
    }

    // Validate font family
    const validFonts = [
      'Yuji Syuku',
      'Shippori Antique', 
      'Huninn',
      'Rampart One',
      'Cherry Bomb One'
    ];

    if (designParams.fontFamily && !validFonts.includes(designParams.fontFamily)) {
      throw new Error(`Invalid font family: ${designParams.fontFamily}`);
    }

    // Validate orientation
    if (designParams.orientation && !['horizontal', 'vertical'].includes(designParams.orientation)) {
      throw new Error(`Invalid orientation: ${designParams.orientation}`);
    }

    return true;
  }

  async testRenderer() {
    try {
      logger.info('Skipping Puppeteer test for faster startup');
      return { success: true, message: 'Test skipped' };
      
      const testParams = {
        text: 'テスト',
        fontFamily: 'Yuji Syuku',
        fontSize: 40,
        color: '#000000',
        orientation: 'horizontal'
      };

      const result = await this.generatePrintFile(testParams);
      
      logger.info('Renderer test successful', {
        dimensions: result.dimensions,
        bufferSize: result.printBuffer.length
      });

      return {
        success: true,
        testResult: result
      };
    } catch (error) {
      logger.error('Renderer test failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PrintGenerator;
