/**
 * Debug Stroke Data Flow
 * 
 * Trace stroke data through the entire pipeline
 */

const OrderProcessor = require('./services/order-processor');
const PrintGenerator = require('./services/print-generator');

async function debugStrokeFlow() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Stroke Data Flow Debug                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Step 1: Simulate frontend data
  console.log('STEP 1: Frontend Data (from Shopify order)');
  console.log('─────────────────────────────────────────────────────────\n');
  
  const mockOrderData = {
    orderId: 'debug-stroke-001',
    designData: {
      _design_params: {
        translatedText: 'テスト',
        originalText: 'Test',
        fontStyle: 'Dela Gothic One',
        fontSize: 36,
        fontColor: '#b32020',
        orientation: 'horizontal',
        
        productType: 'preset_image',
        presetId: 'ja-text-dela-1',
        
        presetConfig: {
          font: 'Dela Gothic One',
          fontSize: 36,
          fontColor: '#b32020',
          orientation: 'horizontal',
          stroke: {
            enabled: true,
            color: '#141414',
            width: 8
          }
        }
      }
    }
  };
  
  console.log('Frontend sends _design_params.presetConfig.stroke:');
  console.log(JSON.stringify(mockOrderData.designData._design_params.presetConfig.stroke, null, 2));
  console.log('\n');
  
  // Step 2: Order Processor extracts design params
  console.log('STEP 2: OrderProcessor.extractDesignParams()');
  console.log('─────────────────────────────────────────────────────────\n');
  
  const orderProcessor = new OrderProcessor();
  const designParams = orderProcessor.extractDesignParams(mockOrderData);
  
  console.log('Extracted designParams.presetConfig.stroke:');
  console.log(JSON.stringify(designParams.presetConfig?.stroke, null, 2));
  console.log('\n✅ Stroke preserved? ', !!designParams.presetConfig?.stroke);
  console.log('\n');
  
  // Step 3: Print Generator applies preset config
  console.log('STEP 3: PrintGenerator.applyPresetConfig()');
  console.log('─────────────────────────────────────────────────────────\n');
  
  const printGenerator = new PrintGenerator();
  const appliedParams = printGenerator.applyPresetConfig(designParams);
  
  console.log('Applied params.stroke:');
  console.log(JSON.stringify(appliedParams.stroke, null, 2));
  console.log('\n✅ Stroke in applied params? ', !!appliedParams.stroke);
  console.log('\n');
  
  // Step 4: Check what gets passed to page.evaluate
  console.log('STEP 4: What gets passed to page.evaluate()?');
  console.log('─────────────────────────────────────────────────────────\n');
  
  console.log('In generatePrintFile(), actualParams will have:');
  console.log('  - stroke:', JSON.stringify(appliedParams.stroke, null, 2));
  console.log('  - presetConfig:', JSON.stringify(appliedParams.presetConfig, null, 2));
  console.log('\n');
  
  console.log('⚠️  QUESTION: Does page.evaluate receive actualParams?');
  console.log('');
  console.log('Check in services/print-generator.js line ~224:');
  console.log('  const result = await page.evaluate(async (params, ...) => {');
  console.log('    return await window.renderPrintDesign(params, ...);');
  console.log('  }, actualParams, ...);  // ← Is it actualParams or designParams?');
  console.log('\n');
  
  // Step 5: Renderer checks
  console.log('STEP 5: Renderer Checks (print-renderer.html)');
  console.log('─────────────────────────────────────────────────────────\n');
  
  console.log('Renderer looks for: designParams.stroke');
  console.log('');
  console.log('if (designParams.stroke && designParams.stroke.enabled) {');
  console.log('  // Apply stroke');
  console.log('}');
  console.log('\n');
  
  console.log('✅ Summary of what should happen:');
  console.log('  1. Frontend sends: presetConfig.stroke ✅');
  console.log('  2. OrderProcessor extracts: presetConfig.stroke ✅');  
  console.log('  3. PrintGenerator applies: adds top-level stroke ✅');
  console.log('  4. page.evaluate receives: actualParams with stroke ❓');
  console.log('  5. Renderer checks: designParams.stroke ❓');
  console.log('\n');
  
  console.log('🔍 NEXT: Check the actual logging from a real order');
  console.log('');
  console.log('Look for these logs in Railway:');
  console.log('  [1] "✅ INCLUDED presetConfig in renderer params"');
  console.log('  [2] "Applied preset config (if present)"');
  console.log('  [3] "[PrintRenderer] Stroke enabled with scaling"');
  console.log('');
  console.log('If you see [1] and [2] but NOT [3]:');
  console.log('  → Stroke is not making it to the renderer');
  console.log('  → Check what params are passed to page.evaluate()');
  console.log('');
}

// Run debug
if (require.main === module) {
  debugStrokeFlow().catch(console.error);
}

module.exports = { debugStrokeFlow };

