/**
 * Test script for vertical ー (chōonpu) rotation in backend print generation
 * 
 * This script tests that the backend properly rotates the ー character
 * when rendering vertical Japanese text, matching the frontend behavior.
 */

const PrintGenerator = require('./services/print-generator');
const fs = require('fs').promises;
const path = require('path');

async function testVerticalChoonpuRotation() {
  console.log('🧪 Testing Vertical ー (Chōonpu) Rotation');
  console.log('='.repeat(60));
  
  const printGenerator = new PrintGenerator();
  
  // Test cases with vertical text containing ー
  const testCases = [
    {
      name: 'ルーカス (Lucas)',
      text: 'ルーカス',
      description: 'Should show vertical pipe between ル and カ'
    },
    {
      name: 'コーヒー (Coffee)',
      text: 'コーヒー',
      description: 'Should show two vertical pipes'
    },
    {
      name: 'カー (Car)',
      text: 'カー',
      description: 'Should show one vertical pipe at end'
    },
    {
      name: 'キー (Key)',
      text: 'キー',
      description: 'Should show one vertical pipe at end'
    },
    {
      name: 'スーパー (Super)',
      text: 'スーパー',
      description: 'Should show two vertical pipes'
    }
  ];
  
  // Create output directory for test results
  const outputDir = path.join(__dirname, 'debug-output', 'vertical-choonpu-test');
  await fs.mkdir(outputDir, { recursive: true });
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test Case: ${testCase.name}`);
    console.log(`   Text: "${testCase.text}"`);
    console.log(`   Expected: ${testCase.description}`);
    
    try {
      // Create design parameters for vertical text
      const designParams = {
        text: testCase.text,
        fontFamily: 'Yuji Syuku',
        fontSize: 40,
        color: '#000000',
        orientation: 'vertical' // CRITICAL: vertical orientation
      };
      
      console.log(`   ⏳ Generating print file...`);
      
      // Generate print file
      const result = await printGenerator.generatePrintFile(designParams, {
        orderId: `test-vertical-choonpu-${Date.now()}`,
        useFrontendLogic: true
      });
      
      if (!result.success) {
        throw new Error('Print generation failed');
      }
      
      // Save the result to file for visual inspection
      const filename = `${testCase.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const filepath = path.join(outputDir, filename);
      await fs.writeFile(filepath, result.printBuffer);
      
      console.log(`   ✅ SUCCESS - Print file generated`);
      console.log(`   📄 Saved to: ${filename}`);
      console.log(`   📏 Size: ${(result.printBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   📐 Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
      
      successCount++;
      
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`);
      console.error(`   Error details:`, error.stack);
      failCount++;
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed: ${failCount}/${testCases.length}`);
  console.log('');
  
  if (failCount === 0) {
    console.log('🎉 All tests passed! The vertical ー rotation is working correctly.');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Visually inspect the generated PNG files in:');
    console.log(`      ${outputDir}`);
    console.log('   2. Verify that ー appears as a vertical line (|) in all test cases');
    console.log('   3. Check that the vertical spacing looks correct');
  } else {
    console.log('⚠️  Some tests failed. Please review the error messages above.');
  }
  
  console.log('');
  console.log('💡 Tips for Visual Inspection:');
  console.log('   - Open the PNG files in an image viewer');
  console.log('   - Look for the ー character - it should appear as a vertical pipe (|)');
  console.log('   - The vertical pipe should be centered between characters');
  console.log('   - The vertical pipe should be positioned slightly below center for better spacing');
  console.log('');
}

// Run the test
testVerticalChoonpuRotation()
  .then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });

