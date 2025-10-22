const fs = require('fs').promises;
const path = require('path');

/**
 * Generate base64-encoded fonts for frontend use
 * Reads TTF files from assets/fonts and creates fonts-base64.json
 */

const FONTS_TO_ENCODE = [
  { family: 'Yuji Syuku', filename: 'YujiSyuku-Regular.ttf' },
  { family: 'Shippori Antique', filename: 'ShipporiAntique-Regular.ttf' },
  { family: 'Huninn', filename: 'Huninn-Regular.ttf' },
  { family: 'Rampart One', filename: 'RampartOne-Regular.ttf' },
  { family: 'Cherry Bomb One', filename: 'CherryBombOne-Regular.ttf' },
  { family: 'Kiwi Maru', filename: 'KiwiMaru-Regular.ttf' },
  { family: 'Klee One', filename: 'KleeOne-Regular.ttf' },
  { family: 'Mochiy Pop One', filename: 'MochiyPopOne-Regular.ttf' },
  { family: 'Noto Sans JP', filename: 'NotoSansJP-Black.ttf' },
  { family: 'Yuji Mai', filename: 'YujiMai-Regular.ttf' },
  { family: 'Dela Gothic One', filename: 'DelaGothicOne-Regular.ttf' },
  { family: 'DotGothic16', filename: 'DotGothic16-Regular.ttf' },
  { family: 'Darumadrop One', filename: 'DarumadropOne-Regular.ttf' }
];

async function encodeFonts() {
  const fontsDir = path.join(__dirname, '../assets/fonts');
  const outputPath = path.join(__dirname, '../assets/fonts-base64.json');
  
  const encodedFonts = {};
  let successCount = 0;
  let failCount = 0;
  
  console.log('🎨 Encoding fonts to base64...\n');
  
  for (const { family, filename } of FONTS_TO_ENCODE) {
    const fontPath = path.join(fontsDir, filename);
    
    try {
      const fontBuffer = await fs.readFile(fontPath);
      const base64 = fontBuffer.toString('base64');
      encodedFonts[family] = base64;
      
      const sizeKB = (fontBuffer.length / 1024).toFixed(1);
      console.log(`✅ ${family.padEnd(20)} (${sizeKB} KB)`);
      successCount++;
    } catch (error) {
      console.log(`⚠️  ${family.padEnd(20)} - ${error.message}`);
      failCount++;
    }
  }
  
  // Write the JSON file
  await fs.writeFile(outputPath, JSON.stringify(encodedFonts, null, 2));
  
  const totalSizeKB = (JSON.stringify(encodedFonts).length / 1024).toFixed(1);
  console.log(`\n📦 Generated: ${outputPath}`);
  console.log(`   Total size: ${totalSizeKB} KB`);
  console.log(`   Fonts encoded: ${successCount}`);
  
  if (failCount > 0) {
    console.log(`\n⚠️  Failed to encode ${failCount} font(s). Make sure all TTF files are present.`);
  }
  
  console.log('\n✨ Done!');
}

encodeFonts().catch(error => {
  console.error('❌ Error encoding fonts:', error);
  process.exit(1);
});

