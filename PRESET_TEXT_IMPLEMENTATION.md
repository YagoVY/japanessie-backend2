# PRESET_TEXT Product Type Implementation

## Overview

Successfully implemented support for **PRESET_TEXT** product type - text-only presets that skip background image composition while still using preset variant mapping.

## Implementation Date
October 21, 2025

## Problem Statement

The frontend sends `productType: "preset_image"` for ALL preset products (both image+text and text-only). The backend needed to intelligently differentiate between:
- **PRESET_IMAGE**: Presets with background images (e.g., `ja-sake`, `wave-vertical`)
- **PRESET_TEXT**: Text-only presets without backgrounds (e.g., `ja-text-dela-1`)

## Solution

### Intelligent Product Type Detection

The backend now determines the actual product type based on **background image availability** in `config/preset-backgrounds.json`:

```javascript
// If presetId exists in preset-backgrounds.json → PRESET_IMAGE
// If presetId NOT in preset-backgrounds.json → PRESET_TEXT
```

### Processing Flow

```
Frontend sends productType: "preset_image" + presetId
    ↓
Backend loads preset-backgrounds.json
    ↓
Check if presetId has background URL
    ↓
    ├─ Has background → PRESET_IMAGE
    │   └─ Generate text PNG → Fetch background → Composite → Upload
    │
    └─ No background → PRESET_TEXT
        └─ Generate text PNG → Upload (skip composition)
```

## Files Modified

### 1. `services/print-generator.js`
**Added:**
- `loadPresetBackgrounds()` - Loads `preset-backgrounds.json` on initialization
- `hasPresetBackground(presetId)` - Checks if preset has background image
- `determinePresetType(designParams)` - Returns 'PRESET_TEXT', 'PRESET_IMAGE', or 'CUSTOM'
- `isPresetTextProduct(designParams)` - Returns true for text-only presets
- `isPresetImageProduct(designParams)` - Returns true for image+text presets

**Modified:**
- `isPresetProduct()` - Updated to recognize both PRESET_TEXT and PRESET_IMAGE

**Key Logic:**
```javascript
determinePresetType(designParams) {
  if (!this.isPresetProduct(designParams)) {
    return 'CUSTOM';
  }
  
  const presetId = this.extractPresetId(designParams);
  
  if (this.hasPresetBackground(presetId)) {
    return 'PRESET_IMAGE';  // Has background in config
  } else {
    return 'PRESET_TEXT';   // No background in config
  }
}
```

### 2. `services/order-processor.js`
**Modified Sections:**

**A. Print File Generation (Lines 185-220):**
```javascript
const productType = this.printGenerator.determinePresetType(designParams);

if (productType === 'PRESET_TEXT') {
  // Text-only: Skip background composition
  printResult = await this.printGenerator.generatePrintFile(designParams, { orderId });
  
} else if (productType === 'PRESET_IMAGE') {
  // Image+text: Fetch background and composite
  printResult = await this.printGenerator.generatePresetPrintFile(designParams, { orderId });
  
} else {
  // CUSTOM: Regular text-only
  printResult = await this.printGenerator.generatePrintFile(designParams, { orderId });
}
```

**B. Variant Selection (Lines 778-810):**
```javascript
// PRIORITY 2: Try preset fallback (for BOTH PRESET_TEXT and PRESET_IMAGE)
if (designParams && designParams.presetId) {
  const productType = this.printGenerator.determinePresetType(designParams);
  const isPresetProduct = productType === 'PRESET_TEXT' || productType === 'PRESET_IMAGE';
  
  if (isPresetProduct) {
    const fallbackVariant = this.presetMapping.presetFallbacks[designParams.presetId];
    // Use preset fallback variant
  }
}
```

**C. Detection Logging (Lines 674-683):**
```javascript
if ((frontendParams.productType === 'preset_image' || frontendParams.productType === 'PRESET_IMAGE') 
    && frontendParams.presetId) {
  const actualType = this.printGenerator.determinePresetType(rendererParams);
  console.log('🎨 Detected preset product from frontend:', {
    frontendProductType: frontendParams.productType,
    actualProductType: actualType,
    presetId: frontendParams.presetId
  });
}
```

### 3. `config/preset-mapping.json`
**Added:**

**A. Preset Fallback (Line 42):**
```json
"preset_fallbacks": {
  "ja-text-dela-1": 4016
}
```

**B. Preset Product Variant (Lines 179-185):**
```json
"preset_product_variants": {
  "ja-text-dela-1": {
    "printfulProductId": 71,
    "defaultVariantId": 4016,
    "productType": "T-shirt",
    "presetType": "PRESET_TEXT",
    "description": "Text-only preset T-shirt (no background image)"
  }
}
```

### 4. `config/preset-backgrounds.json`
**No Changes Required**

`ja-text-dela-1` is intentionally NOT added to this file. Its absence is what makes it a PRESET_TEXT product.

## Test Results

Created comprehensive test suite: `test-preset-text-implementation.js`

### Test Suite Results
```
✅ Total Tests: 11
✅ Passed: 11
❌ Failed: 0
✅ Success Rate: 100.0%
```

### Tests Verified
1. ✅ PRESET_TEXT detection for `ja-text-dela-1`
2. ✅ PRESET_IMAGE detection for `ja-sake`
3. ✅ CUSTOM detection for non-preset products
4. ✅ `isPresetProduct()` returns true for PRESET_TEXT
5. ✅ `isPresetTextProduct()` returns true for text-only presets
6. ✅ `isPresetImageProduct()` returns false for text-only presets
7. ✅ `hasPresetBackground()` returns false for text-only presets
8. ✅ Variant mapping uses `preset_fallback` for PRESET_TEXT
9. ✅ Configuration files loaded successfully
10. ✅ `preset-backgrounds.json` contains 22 presets
11. ✅ `ja-text-dela-1` NOT in backgrounds config

## Product Type Comparison

| Feature | CUSTOM | PRESET_TEXT | PRESET_IMAGE |
|---------|--------|-------------|--------------|
| **Text Generation** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Background Image** | ❌ No | ❌ No | ✅ Yes |
| **Image Composition** | ❌ No | ❌ No | ✅ Yes |
| **Preset Variant Mapping** | ❌ No | ✅ Yes | ✅ Yes |
| **Frontend productType** | (none) | `"preset_image"` | `"preset_image"` |
| **Backend Detection** | No presetId | PresetId not in backgrounds | PresetId in backgrounds |
| **Processing Method** | `generatePrintFile()` | `generatePrintFile()` | `generatePresetPrintFile()` |

## Frontend Integration

Frontend continues to send the same format for ALL presets:

```javascript
const designParams = {
  _design_params: {
    translatedText: "こんにちは",
    originalText: "Hello",
    fontStyle: "Yuji Syuku",
    fontSize: 40,
    fontColor: "#000000",
    orientation: "horizontal",
    
    // Same for both PRESET_TEXT and PRESET_IMAGE
    productType: "preset_image",
    presetId: "ja-text-dela-1",  // or "ja-sake", etc.
    
    shopifyVariantId: "12345678",
    textCoordinates: {...}
  }
};
```

**Backend automatically determines the actual type!**

## Configuration Guide

### Adding a New PRESET_TEXT Product

**Step 1:** Add to `config/preset-mapping.json`
```json
{
  "preset_fallbacks": {
    "your-new-preset": 4016  // Your Printful variant ID
  },
  
  "preset_product_variants": {
    "your-new-preset": {
      "printfulProductId": 71,
      "defaultVariantId": 4016,
      "productType": "T-shirt",
      "presetType": "PRESET_TEXT",
      "description": "Your description"
    }
  }
}
```

**Step 2:** DO NOT add to `config/preset-backgrounds.json`

**Step 3:** That's it! The absence from `preset-backgrounds.json` makes it PRESET_TEXT

### Adding a New PRESET_IMAGE Product

**Step 1:** Add to `config/preset-mapping.json` (same as above)

**Step 2:** Add to `config/preset-backgrounds.json`
```json
{
  "preset_backgrounds": {
    "your-new-preset": "https://your-s3-url/background.png"
  }
}
```

**Step 3:** The presence in `preset-backgrounds.json` makes it PRESET_IMAGE

## Logging & Debugging

The implementation includes comprehensive logging:

```
18:06:50 [info]: Loaded preset backgrounds config {"presetCount":22}
18:06:50 [info]: Checking background for preset ja-text-dela-1:
18:06:50 [info]: Preset ja-text-dela-1 classified as PRESET_TEXT (no background)
18:06:50 [info]: Product type determined: PRESET_TEXT
18:06:50 [info]: Processing PRESET_TEXT product for order test-001
18:06:50 [info]: PRIORITY 2: Using preset fallback for ja-text-dela-1
```

## Benefits

1. **Zero Frontend Changes** - Frontend sends same format for all presets
2. **Intelligent Backend** - Automatically determines product type
3. **Simple Configuration** - Add/remove presets by editing JSON files
4. **Optimized Processing** - Skips unnecessary background fetching for text-only
5. **Consistent Variant Mapping** - All presets use same variant selection logic
6. **Easy Testing** - Comprehensive test suite included

## Migration Path

### Existing PRESET_IMAGE Products
No changes required. All existing presets with backgrounds in `preset-backgrounds.json` continue to work as PRESET_IMAGE.

### New PRESET_TEXT Products
Simply add to `preset-mapping.json` without adding to `preset-backgrounds.json`.

## Next Steps

1. **Update Printful Variant IDs** - Replace placeholder `4016` with actual variant IDs for `ja-text-dela-1`
2. **Add More Presets** - Add additional text-only presets as needed
3. **Test Real Orders** - Process test orders through Shopify webhook
4. **Monitor Logs** - Verify correct product type detection in production

## Files Created

- `test-preset-text-implementation.js` - Comprehensive test suite
- `PRESET_TEXT_IMPLEMENTATION.md` - This documentation file

## Success Criteria

✅ Backend detects PRESET_TEXT vs PRESET_IMAGE automatically  
✅ PRESET_TEXT skips background fetching/composition  
✅ PRESET_TEXT uses preset variant mapping  
✅ All tests pass (11/11)  
✅ Configuration is simple and maintainable  
✅ No frontend changes required  

---

**Implementation Status:** ✅ COMPLETE

**Test Status:** ✅ ALL TESTS PASSING

**Ready for Production:** ✅ YES (after updating variant IDs)

