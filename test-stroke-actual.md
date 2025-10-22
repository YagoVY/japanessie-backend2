# Stroke Not Appearing - Investigation

## What We Know ✅

1. **Frontend sends stroke** ✅
   - presetConfig.stroke: { enabled: true, color: "#141414", width: 8 }

2. **Backend extracts stroke** ✅
   - OrderProcessor extracts presetConfig.stroke
   - Log: "✅ INCLUDED presetConfig in renderer params"

3. **PrintGenerator applies stroke** ✅  
   - applyPresetConfig() adds top-level stroke property
   - actualParams.stroke = { enabled: true, color: "#141414", width: 8 }
   - Log: "Applied preset config (if present)"

4. **page.evaluate receives stroke** ✅
   - Line 323: passes `actualParams` to renderer
   - actualParams has stroke property

5. **Renderer has stroke code** ✅
   - Lines 918-947: Apply stroke if provided
   - Lines 948-979: Apply shadow if provided

## The Problem 🔍

The stroke code EXISTS but might not be EXECUTING.

## Possible Issues

### Issue 1: Missing textCoordinates

**For PRESET_TEXT products with presetConfig:**
- Frontend sends presetConfig.position (not textCoordinates)
- position: { x: 360, y: 160 }

**The code has 3 paths:**

```javascript
// Path 1: Frontend coordinates (line 809)
if (designParams.textCoordinates && designParams.textCoordinates.coordinates) {
  // Uses textCoordinates
}

// Path 2: Frontend logic (line 836)
else if (useFrontendLogic) {
  // Uses canvas center
}

// Path 3: Backend logic (line 878)
else {
  // Uses TextLayoutEngine
}
```

**Question:** Which path is being taken for PRESET_TEXT?
- If using Path 1: Needs textCoordinates (might fail)
- If using Path 2: Should work
- If using Path 3: Should work

### Issue 2: customPosition Not in designParams

**The stroke code checks:**
```javascript
if (designParams.customPosition && i === 0) {
  // Use custom position
}
```

**But actualParams has:**
- actualParams.customPosition = { x: 360, y: 160 } ✅

**This should work!**

### Issue 3: layout.printArea might be undefined

**Stroke scaling uses:**
```javascript
const strokeWidthScale = Math.max(
  this.printWidth / layout.printArea.width,
  this.printHeight / layout.printArea.height
);
```

**If layout.printArea is undefined:**
- Division by undefined = NaN
- scaledStrokeWidth = 8 * NaN = NaN
- ctx.lineWidth = NaN → No stroke!

## What to Check in Logs

Look for these specific logs in Railway/Console:

1. **"✅ INCLUDED presetConfig in renderer params"** - Should be there ✅

2. **"Applied preset config (if present)"** - Should be there ✅

3. **"[PrintRenderer] Starting renderPrintDesign with params:"** 
   - Check if params.stroke exists
   - Check if params.customPosition exists

4. **"[PrintRenderer] Stroke enabled with scaling:"**
   - If you see this: stroke code IS executing
   - If you DON'T see this: stroke code is NOT executing

5. **Check for errors:**
   - "layout.printArea is undefined"
   - "Cannot read property 'width' of undefined"
   - NaN in strokeWidth calculations

## The Fix

### If layout.printArea is undefined:

Add a fallback in print-renderer.html:

```javascript
// Apply stroke if provided (for PRESET_TEXT with stroke config)
let hasStroke = false;
let scaledStrokeWidth = 1;
if (designParams.stroke && designParams.stroke.enabled) {
    hasStroke = true;
    
    // Fallback if printArea is missing
    const printAreaWidth = layout.printArea?.width || this.printWidth;
    const printAreaHeight = layout.printArea?.height || this.printHeight;
    
    const strokeWidthScale = Math.max(
        this.printWidth / printAreaWidth,
        this.printHeight / printAreaHeight
    );
    
    scaledStrokeWidth = (designParams.stroke.width || 1) * strokeWidthScale;
    
    // Log for debugging
    console.log('[PrintRenderer] Stroke calculation:', {
        hasStroke: true,
        originalWidth: designParams.stroke.width,
        printAreaWidth,
        printAreaHeight,
        printWidth: this.printWidth,
        printHeight: this.printHeight,
        strokeWidthScale,
        scaledStrokeWidth
    });
    
    this.ctx.strokeStyle = designParams.stroke.color;
    this.ctx.lineWidth = scaledStrokeWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.miterLimit = 2;
}
```

### If designParams doesn't have stroke:

The issue is that `applyPresetConfig` returns a new object, but we need to make sure that object is what gets passed to the renderer.

**Check:** Is `actualParams` the same object that gets to the renderer?

## Action Items

1. Add console.log in renderDesign to see what designParams contains
2. Add console.log to check if layout.printArea exists
3. Add fallback for missing printArea
4. Test with a real order and check Railway logs


