/**
 * Test PRESET_TEXT Implementation
 * 
 * This test verifies that the new PRESET_TEXT product type works correctly:
 * 1. Frontend sends productType: "preset_image" for all presets
 * 2. Backend intelligently determines PRESET_TEXT vs PRESET_IMAGE
 * 3. PRESET_TEXT skips background fetching/composition
 * 4. PRESET_TEXT uses preset variant mapping
 */

const PrintGenerator = require('./services/print-generator');
const OrderProcessor = require('./services/order-processor');

async function testPresetTextDetection() {
  console.log('\n=== TEST 1: PRESET_TEXT Detection ===\n');
  
  const printGenerator = new PrintGenerator();
  
  // Test data for ja-text-dela-1 (text-only preset, no background)
  const presetTextParams = {
    text: 'こんにちは',
    fontFamily: 'Yuji Syuku',
    fontSize: 40,
    color: '#000000',
    orientation: 'horizontal',
    productType: 'preset_image',  // Frontend sends this for ALL presets
    presetId: 'ja-text-dela-1'     // This preset has NO background
  };
  
  // Test data for ja-sake (image+text preset, has background)
  const presetImageParams = {
    text: 'こんにちは',
    fontFamily: 'Yuji Syuku',
    fontSize: 40,
    color: '#000000',
    orientation: 'horizontal',
    productType: 'preset_image',  // Frontend sends this for ALL presets
    presetId: 'ja-sake'            // This preset HAS background
  };
  
  // Test data for custom product (no preset)
  const customParams = {
    text: 'こんにちは',
    fontFamily: 'Yuji Syuku',
    fontSize: 40,
    color: '#000000',
    orientation: 'horizontal'
    // No productType, no presetId
  };
  
  console.log('Test 1a: ja-text-dela-1 should be PRESET_TEXT');
  const type1 = printGenerator.determinePresetType(presetTextParams);
  console.log(`  Result: ${type1}`);
  console.log(`  ✓ Expected: PRESET_TEXT, Got: ${type1}`);
  console.log(`  ${type1 === 'PRESET_TEXT' ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Test 1b: ja-sake should be PRESET_IMAGE');
  const type2 = printGenerator.determinePresetType(presetImageParams);
  console.log(`  Result: ${type2}`);
  console.log(`  ✓ Expected: PRESET_IMAGE, Got: ${type2}`);
  console.log(`  ${type2 === 'PRESET_IMAGE' ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Test 1c: Custom product should be CUSTOM');
  const type3 = printGenerator.determinePresetType(customParams);
  console.log(`  Result: ${type3}`);
  console.log(`  ✓ Expected: CUSTOM, Got: ${type3}`);
  console.log(`  ${type3 === 'CUSTOM' ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return {
    test1a: type1 === 'PRESET_TEXT',
    test1b: type2 === 'PRESET_IMAGE',
    test1c: type3 === 'CUSTOM'
  };
}

async function testPresetTextHelpers() {
  console.log('\n=== TEST 2: Helper Methods ===\n');
  
  const printGenerator = new PrintGenerator();
  
  const presetTextParams = {
    productType: 'preset_image',
    presetId: 'ja-text-dela-1'
  };
  
  console.log('Test 2a: isPresetProduct() should return true for ja-text-dela-1');
  const isPreset = printGenerator.isPresetProduct(presetTextParams);
  console.log(`  Result: ${isPreset}`);
  console.log(`  ${isPreset ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Test 2b: isPresetTextProduct() should return true for ja-text-dela-1');
  const isPresetText = printGenerator.isPresetTextProduct(presetTextParams);
  console.log(`  Result: ${isPresetText}`);
  console.log(`  ${isPresetText ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Test 2c: isPresetImageProduct() should return false for ja-text-dela-1');
  const isPresetImage = printGenerator.isPresetImageProduct(presetTextParams);
  console.log(`  Result: ${isPresetImage}`);
  console.log(`  ${!isPresetImage ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Test 2d: hasPresetBackground() should return false for ja-text-dela-1');
  const hasBackground = printGenerator.hasPresetBackground('ja-text-dela-1');
  console.log(`  Result: ${hasBackground}`);
  console.log(`  ${!hasBackground ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return {
    test2a: isPreset,
    test2b: isPresetText,
    test2c: !isPresetImage,
    test2d: !hasBackground
  };
}

async function testVariantMapping() {
  console.log('\n=== TEST 3: Variant Mapping ===\n');
  
  const orderProcessor = new OrderProcessor();
  
  const mockOrderData = {
    orderId: 'test-preset-text-001',
    lineItems: [{
      variant_id: '99999999999',  // Unknown variant
      quantity: 1
    }]
  };
  
  const designParams = {
    text: 'こんにちは',
    fontFamily: 'Yuji Syuku',
    fontSize: 40,
    color: '#000000',
    orientation: 'horizontal',
    productType: 'preset_image',
    presetId: 'ja-text-dela-1',
    shopifyVariantId: '99999999999'  // Not in mapping
  };
  
  console.log('Test 3: Variant extraction should use preset_fallback for ja-text-dela-1');
  try {
    const variantInfo = orderProcessor.extractVariantInfo(mockOrderData, designParams);
    console.log('  Variant Info:', JSON.stringify(variantInfo, null, 2));
    console.log(`  Selection Method: ${variantInfo.selectionMethod}`);
    console.log(`  Variant ID: ${variantInfo.variantId}`);
    console.log(`  Preset ID: ${variantInfo.presetId}`);
    
    const isCorrect = variantInfo.selectionMethod === 'preset_fallback' && 
                     variantInfo.presetId === 'ja-text-dela-1' &&
                     variantInfo.variantId === 4016;
    
    console.log(`  ${isCorrect ? '✅ PASS' : '❌ FAIL'}\n`);
    
    return { test3: isCorrect };
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}\n`);
    return { test3: false };
  }
}

async function testConfigurationLoaded() {
  console.log('\n=== TEST 4: Configuration Loading ===\n');
  
  const printGenerator = new PrintGenerator();
  
  console.log('Test 4a: preset-backgrounds.json should be loaded');
  const hasBackgrounds = Object.keys(printGenerator.presetBackgrounds).length > 0;
  console.log(`  Loaded ${Object.keys(printGenerator.presetBackgrounds).length} preset backgrounds`);
  console.log(`  ${hasBackgrounds ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Test 4b: ja-text-dela-1 should NOT be in preset-backgrounds.json');
  const notInBackgrounds = !printGenerator.presetBackgrounds['ja-text-dela-1'];
  console.log(`  ja-text-dela-1 in backgrounds: ${!!printGenerator.presetBackgrounds['ja-text-dela-1']}`);
  console.log(`  ${notInBackgrounds ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Test 4c: ja-sake SHOULD be in preset-backgrounds.json');
  const inBackgrounds = !!printGenerator.presetBackgrounds['ja-sake'];
  console.log(`  ja-sake in backgrounds: ${inBackgrounds}`);
  console.log(`  ${inBackgrounds ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return {
    test4a: hasBackgrounds,
    test4b: notInBackgrounds,
    test4c: inBackgrounds
  };
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         PRESET_TEXT Implementation Test Suite           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    const results1 = await testPresetTextDetection();
    const results2 = await testPresetTextHelpers();
    const results3 = await testVariantMapping();
    const results4 = await testConfigurationLoaded();
    
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
      console.log('✅ PRESET_TEXT implementation is working correctly!\n');
      console.log('Key Features Verified:');
      console.log('  ✓ Backend intelligently detects PRESET_TEXT vs PRESET_IMAGE');
      console.log('  ✓ Detection based on preset-backgrounds.json');
      console.log('  ✓ Helper methods work correctly');
      console.log('  ✓ Variant mapping uses preset_fallback for PRESET_TEXT');
      console.log('  ✓ Configuration files loaded successfully\n');
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

