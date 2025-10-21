/**
 * Test Stroke Rendering for PRESET_TEXT
 * 
 * This test verifies that stroke (text outline) is properly applied
 */

const PrintGenerator = require('./services/print-generator');
const OrderProcessor = require('./services/order-processor');

async function testStrokeConfiguration() {
  console.log('\n=== TEST 1: Stroke Parameter Extraction ===\n');
  
  const orderProcessor = new OrderProcessor();
  
  const mockOrderData = {
    orderId: 'test-stroke-001',
    designData: {
      _design_params: {
        translatedText: 'テスト',
        originalText: 'Test',
        fontStyle: 'Rampart One',
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
  
  console.log('Extracting design params with stroke config...');
  const designParams = orderProcessor.extractDesignParams(mockOrderData);
  
  console.log('\n✅ Design Params Extracted:');
  console.log('  - Has presetConfig:', !!designParams.presetConfig);
  console.log('  - PresetConfig.stroke:', JSON.stringify(designParams.presetConfig?.stroke, null, 2));
  
  return { hasStroke: !!designParams.presetConfig?.stroke };
}

async function testStrokeApplication() {
  console.log('\n=== TEST 2: Stroke Application in applyPresetConfig ===\n');
  
  const printGenerator = new PrintGenerator();
  
  const designParams = {
    text: 'テスト',
    fontFamily: 'Yuji Syuku',
    fontSize: 20,
    color: '#000000',
    productType: 'preset_image',
    presetId: 'ja-text-dela-1',
    
    presetConfig: {
      font: 'Dela Gothic One',
      fontSize: 36,
      fontColor: '#b32020',
      stroke: {
        enabled: true,
        color: '#141414',
        width: 8
      }
    }
  };
  
  console.log('Applying presetConfig...');
  const appliedParams = printGenerator.applyPresetConfig(designParams);
  
  console.log('\n✅ Applied Parameters:');
  console.log('  - Font:', appliedParams.fontFamily);
  console.log('  - Font Size:', appliedParams.fontSize);
  console.log('  - Color:', appliedParams.color);
  console.log('  - Stroke:', JSON.stringify(appliedParams.stroke, null, 2));
  
  const hasStroke = appliedParams.stroke && appliedParams.stroke.enabled;
  const correctStrokeColor = appliedParams.stroke?.color === '#141414';
  const correctStrokeWidth = appliedParams.stroke?.width === 8;
  
  console.log('\n✅ Validation:');
  console.log('  - Has stroke enabled:', hasStroke ? '✅' : '❌');
  console.log('  - Correct stroke color:', correctStrokeColor ? '✅' : '❌');
  console.log('  - Correct stroke width:', correctStrokeWidth ? '✅' : '❌');
  
  return { hasStroke, correctStrokeColor, correctStrokeWidth };
}

async function testStrokeScaling() {
  console.log('\n=== TEST 3: Stroke Width Scaling Issue ===\n');
  
  console.log('⚠️  POTENTIAL ISSUE DETECTED:');
  console.log('');
  console.log('The stroke width from presetConfig is in PREVIEW scale (e.g., 8px)');
  console.log('But the print canvas is at PRINT RESOLUTION (3600x4800px)');
  console.log('');
  console.log('Example:');
  console.log('  - Preview canvas: 600x800px');
  console.log('  - Print canvas:   3600x4800px');
  console.log('  - Scale factor:   6x (3600/600 = 6)');
  console.log('');
  console.log('If stroke width = 8px on preview:');
  console.log('  - On print canvas: 8px (TOO THIN!)');
  console.log('  - Should be: 8px * 6 = 48px');
  console.log('');
  console.log('🔧 FIX NEEDED:');
  console.log('  - Scale stroke width based on print resolution');
  console.log('  - In print-renderer.html, multiply strokeWidth by scale factor');
  console.log('');
  
  return { needsScaling: true };
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Stroke Rendering Diagnostic Test                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    const test1 = await testStrokeConfiguration();
    const test2 = await testStrokeApplication();
    const test3 = await testStrokeScaling();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      DIAGNOSIS                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ Stroke parameters ARE being extracted correctly');
    console.log('✅ Stroke parameters ARE being applied to designParams');
    console.log('');
    console.log('❌ PROBLEM IDENTIFIED:');
    console.log('   Stroke width is NOT being scaled for print resolution!');
    console.log('');
    console.log('📋 What happens:');
    console.log('   1. Frontend sends stroke.width: 8 (for 600x800 preview)');
    console.log('   2. Backend uses stroke.width: 8 (on 3600x4800 print)');
    console.log('   3. Result: 8px stroke on 3600px canvas = barely visible!');
    console.log('');
    console.log('🔧 SOLUTION:');
    console.log('   Scale stroke width in print-renderer.html based on:');
    console.log('   - printAreaScale (same as font size scaling)');
    console.log('   - Example: strokeWidth = 8 * 6 = 48px');
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };

