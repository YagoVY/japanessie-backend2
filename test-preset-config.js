/**
 * Test PresetConfig Support for PRESET_TEXT
 * 
 * This test verifies that presetConfig styling is correctly applied:
 * 1. PresetConfig extraction from _design_params
 * 2. Font mapping and styling application
 * 3. Stroke, shadow, and position support
 * 4. PresetConfig overrides top-level params for PRESET_TEXT
 */

const PrintGenerator = require('./services/print-generator');
const OrderProcessor = require('./services/order-processor');

async function testPresetConfigExtraction() {
  console.log('\n=== TEST 1: PresetConfig Extraction ===\n');
  
  const orderProcessor = new OrderProcessor();
  
  // Simulate order data with presetConfig
  const mockOrderData = {
    orderId: 'test-preset-config-001',
    designData: {
      _design_params: {
        translatedText: 'テスト',
        originalText: 'Test',
        fontStyle: 'Yuji Syuku',  // Top-level (should be ignored)
        fontSize: 20,              // Top-level (should be ignored)
        fontColor: '#ff0000',      // Top-level (should be ignored)
        orientation: 'horizontal',
        
        productType: 'preset_image',
        presetId: 'ja-text-dela-1',
        
        // PresetConfig (should be used instead of top-level for PRESET_TEXT)
        presetConfig: {
          font: 'Rampart One',
          fontSize: 36,
          fontColor: '#b32020',
          orientation: 'horizontal',
          position: { x: 360, y: 160 },
          stroke: {
            enabled: true,
            color: '#141414',
            width: 8
          },
          shadow: {
            enabled: false,
            color: '#000000',
            blur: 4,
            offsetX: 2,
            offsetY: 2
          },
          letterSpacing: 0.92
        }
      }
    }
  };
  
  console.log('Test 1: Extracting presetConfig from _design_params');
  const designParams = orderProcessor.extractDesignParams(mockOrderData);
  
  console.log('\nExtracted Design Params:');
  console.log('  - Top-level fontFamily:', designParams.fontFamily);
  console.log('  - Top-level fontSize:', designParams.fontSize);
  console.log('  - Top-level color:', designParams.color);
  console.log('  - Has presetConfig:', !!designParams.presetConfig);
  
  if (designParams.presetConfig) {
    console.log('\nPresetConfig Details:');
    console.log('  - font:', designParams.presetConfig.font);
    console.log('  - fontSize:', designParams.presetConfig.fontSize);
    console.log('  - fontColor:', designParams.presetConfig.fontColor);
    console.log('  - stroke.enabled:', designParams.presetConfig.stroke?.enabled);
    console.log('  - stroke.color:', designParams.presetConfig.stroke?.color);
    console.log('  - stroke.width:', designParams.presetConfig.stroke?.width);
    console.log('  - shadow.enabled:', designParams.presetConfig.shadow?.enabled);
    console.log('  - position:', designParams.presetConfig.position);
    console.log('  - letterSpacing:', designParams.presetConfig.letterSpacing);
  }
  
  const hasConfig = !!designParams.presetConfig;
  console.log(`\n  ${hasConfig ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return { test1: hasConfig };
}

async function testPresetConfigApplication() {
  console.log('\n=== TEST 2: PresetConfig Application ===\n');
  
  const printGenerator = new PrintGenerator();
  
  // PRESET_TEXT product with presetConfig
  const presetTextParams = {
    text: 'テスト',
    fontFamily: 'Yuji Syuku',  // Should be overridden
    fontSize: 20,               // Should be overridden
    color: '#ff0000',           // Should be overridden
    orientation: 'horizontal',
    productType: 'preset_image',
    presetId: 'ja-text-dela-1',
    
    presetConfig: {
      font: 'Rampart One',
      fontSize: 36,
      fontColor: '#b32020',
      orientation: 'horizontal',
      position: { x: 360, y: 160 },
      stroke: {
        enabled: true,
        color: '#141414',
        width: 8
      },
      shadow: {
        enabled: false
      },
      letterSpacing: 0.92
    }
  };
  
  console.log('Test 2a: Applying presetConfig for PRESET_TEXT');
  const appliedParams = printGenerator.applyPresetConfig(presetTextParams);
  
  console.log('\nOriginal Params:');
  console.log('  - fontFamily:', presetTextParams.fontFamily);
  console.log('  - fontSize:', presetTextParams.fontSize);
  console.log('  - color:', presetTextParams.color);
  
  console.log('\nApplied Params (after presetConfig):');
  console.log('  - fontFamily:', appliedParams.fontFamily);
  console.log('  - fontSize:', appliedParams.fontSize);
  console.log('  - color:', appliedParams.color);
  console.log('  - letterSpacing:', appliedParams.letterSpacing);
  console.log('  - stroke:', appliedParams.stroke);
  console.log('  - shadow:', appliedParams.shadow);
  console.log('  - customPosition:', appliedParams.customPosition);
  
  const fontChanged = appliedParams.fontFamily === 'Rampart One';
  const sizeChanged = appliedParams.fontSize === 36;
  const colorChanged = appliedParams.color === '#b32020';
  const hasStroke = appliedParams.stroke && appliedParams.stroke.enabled;
  const hasCustomPos = appliedParams.customPosition && appliedParams.customPosition.x === 360;
  
  console.log('\nValidation:');
  console.log(`  - Font overridden: ${fontChanged ? '✅' : '❌'} (expected "Rampart One", got "${appliedParams.fontFamily}")`);
  console.log(`  - Size overridden: ${sizeChanged ? '✅' : '❌'} (expected 36, got ${appliedParams.fontSize})`);
  console.log(`  - Color overridden: ${colorChanged ? '✅' : '❌'} (expected "#b32020", got "${appliedParams.color}")`);
  console.log(`  - Stroke applied: ${hasStroke ? '✅' : '❌'}`);
  console.log(`  - Custom position applied: ${hasCustomPos ? '✅' : '❌'}`);
  
  const allPassed = fontChanged && sizeChanged && colorChanged && hasStroke && hasCustomPos;
  console.log(`\n  ${allPassed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return { 
    test2a: fontChanged,
    test2b: sizeChanged,
    test2c: colorChanged,
    test2d: hasStroke,
    test2e: hasCustomPos
  };
}

async function testPresetImageIgnoresConfig() {
  console.log('\n=== TEST 3: PRESET_IMAGE Should Ignore PresetConfig ===\n');
  
  const printGenerator = new PrintGenerator();
  
  // PRESET_IMAGE product (has background) - should NOT apply presetConfig
  const presetImageParams = {
    text: 'テスト',
    fontFamily: 'Yuji Syuku',
    fontSize: 20,
    color: '#ff0000',
    productType: 'preset_image',
    presetId: 'ja-sake',  // Has background, so PRESET_IMAGE
    
    presetConfig: {
      font: 'Rampart One',
      fontSize: 36,
      fontColor: '#b32020'
    }
  };
  
  console.log('Test 3: PresetConfig should be ignored for PRESET_IMAGE products');
  const appliedParams = printGenerator.applyPresetConfig(presetImageParams);
  
  const fontNotChanged = appliedParams.fontFamily === 'Yuji Syuku';
  const sizeNotChanged = appliedParams.fontSize === 20;
  const colorNotChanged = appliedParams.color === '#ff0000';
  
  console.log('\nValidation:');
  console.log(`  - Font NOT changed: ${fontNotChanged ? '✅' : '❌'} (should stay "Yuji Syuku")`);
  console.log(`  - Size NOT changed: ${sizeNotChanged ? '✅' : '❌'} (should stay 20)`);
  console.log(`  - Color NOT changed: ${colorNotChanged ? '✅' : '❌'} (should stay "#ff0000")`);
  
  const allPassed = fontNotChanged && sizeNotChanged && colorNotChanged;
  console.log(`\n  ${allPassed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return {
    test3a: fontNotChanged,
    test3b: sizeNotChanged,
    test3c: colorNotChanged
  };
}

async function testFontMapping() {
  console.log('\n=== TEST 4: Font Name Mapping ===\n');
  
  const printGenerator = new PrintGenerator();
  
  const testCases = [
    { input: 'Dela Gothic One', expected: 'Dela Gothic One' },
    { input: 'Rampart One', expected: 'Rampart One' },
    { input: 'Yuji Syuku', expected: 'Yuji Syuku' },
    { input: 'Unknown Font', expected: 'Unknown Font' }
  ];
  
  const results = testCases.map(test => {
    const result = printGenerator.mapFontName(test.input);
    const passed = result === test.expected;
    console.log(`  Font "${test.input}" → "${result}": ${passed ? '✅' : '❌'}`);
    return passed;
  });
  
  const allPassed = results.every(r => r);
  console.log(`\n  ${allPassed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return {
    test4: allPassed
  };
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       PresetConfig Support Test Suite                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    const results1 = await testPresetConfigExtraction();
    const results2 = await testPresetConfigApplication();
    const results3 = await testPresetImageIgnoresConfig();
    const results4 = await testFontMapping();
    
    const allResults = { ...results1, ...results2, ...results3, ...results4 };
    const allTests = Object.values(allResults);
    const passed = allTests.filter(r => r).length;
    const total = allTests.length;
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`  Total Tests: ${total}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${total - passed}`);
    console.log(`  Success Rate: ${((passed/total) * 100).toFixed(1)}%\n`);
    
    if (passed === total) {
      console.log('  🎉 ALL TESTS PASSED! 🎉\n');
      console.log('✅ PresetConfig support is working correctly!\n');
      console.log('Key Features Verified:');
      console.log('  ✓ PresetConfig extracted from _design_params');
      console.log('  ✓ PresetConfig applied for PRESET_TEXT products');
      console.log('  ✓ PresetConfig ignored for PRESET_IMAGE products');
      console.log('  ✓ Font mapping works correctly');
      console.log('  ✓ Stroke, shadow, and custom position supported\n');
      
      console.log('⚠️  NOTE: "Dela Gothic One" font is not in assets/fonts/');
      console.log('    Add DelaGothicOne-Regular.ttf to assets/fonts/ if needed\n');
    } else {
      console.log('  ⚠️  SOME TESTS FAILED\n');
      console.log('Failed tests:');
      Object.entries(allResults).forEach(([test, passed]) => {
        if (!passed) {
          console.log(`  ❌ ${test}`);
        }
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };

