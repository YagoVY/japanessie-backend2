# Quick Reference: Vertical ー Rotation Implementation

## At a Glance

### What Changed
The backend now rotates the ー character 90 degrees when rendering vertical Japanese text, matching the frontend behavior.

### Where Changed
**File:** `print-renderer.html` (lines ~1202-1362)

## Code Changes

### Before (Old Code)
```javascript
// Direct character drawing without rotation
if (hasStroke) {
    this.ctx.strokeText(char, currentX, printY);
}
this.ctx.fillText(char, currentX, printY);
```

### After (New Code)
```javascript
// Character drawing with automatic ー rotation support
drawCharacter(char, currentX, printY, orientation);

// Where drawCharacter is defined as:
const drawCharacter = (char, x, y, orientation) => {
    if (orientation === 'vertical' && char === 'ー') {
        this.ctx.save();
        const charWidth = this.ctx.measureText(char).width;
        const yOffset = printFontSize * 0.15;
        this.ctx.translate(x + charWidth / 2, y - charWidth / 2 + yOffset);
        this.ctx.rotate(Math.PI / 2);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        if (hasStroke) {
            this.ctx.strokeText(char, 0, 0);
        }
        this.ctx.fillText(char, 0, 0);
        this.ctx.restore();
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
    } else {
        if (hasStroke) {
            this.ctx.strokeText(char, x, y);
        }
        this.ctx.fillText(char, x, y);
    }
};
```

## Visual Comparison

### Horizontal Text (No Change)
```
Before: コーヒー
After:  コーヒー
```
✅ No change - ー remains horizontal

### Vertical Text (Changed!)

**Before:**
```
コ
ー  ← Horizontal (WRONG)
ヒ
ー  ← Horizontal (WRONG)
```

**After:**
```
コ
|  ← Vertical (CORRECT!)
ヒ
|  ← Vertical (CORRECT!)
```

## Key Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Rotation Angle | 90° (Math.PI/2) | Converts horizontal dash to vertical pipe |
| Vertical Offset | fontSize * 0.15 | Improves spacing between characters |
| Pivot Point | (x + width/2, y - width/2 + offset) | Center of character with offset |
| Text Alignment | center/middle | Proper alignment during rotation |

## Testing One-Liner

```bash
node test-vertical-choonpu-rotation.js
```

## Expected Output

```
🧪 Testing Vertical ー (Chōonpu) Rotation
============================================================
📁 Output directory: debug-output/vertical-choonpu-test

📝 Test Case: ルーカス (Lucas)
   Text: "ルーカス"
   Expected: Should show vertical pipe between ル and カ
   ⏳ Generating print file...
   ✅ SUCCESS - Print file generated
   📄 Saved to: Lucas.png
   
[... more test cases ...]

============================================================
📊 Test Results Summary
============================================================
✅ Passed: 5/5
❌ Failed: 0/5

🎉 All tests passed! The vertical ー rotation is working correctly.
```

## Integration Points

### Where This Affects:
- ✅ Print file generation (Puppeteer rendering)
- ✅ Preset products with vertical text
- ✅ Custom products with vertical text
- ✅ All font families
- ✅ Text with strokes/shadows
- ✅ Multi-color text

### Where This Doesn't Affect:
- ❌ Horizontal text (ー remains horizontal)
- ❌ Other characters (only affects ー)
- ❌ Frontend preview (already working)
- ❌ Order processing logic
- ❌ Variant mapping

## Troubleshooting

### Issue: ー is still horizontal
**Check:** Is `orientation` set to `'vertical'` in designParams?

### Issue: ー looks misaligned
**Check:** Verify `fontSize * 0.15` vertical offset calculation

### Issue: Characters after ー are wrong position
**Check:** Ensure `ctx.restore()` is called to reset canvas state

### Issue: Stroke not rendering on ー
**Check:** `hasStroke` variable is available in scope

## Related Documentation

- `BACKEND_VERTICAL_CHOONPU_ROTATION.md` - Full technical details
- `VERTICAL_CHOONPU_IMPLEMENTATION_COMPLETE.md` - Complete summary
- `test-vertical-choonpu-rotation.js` - Automated test script

## Quick Links

**Main Implementation:**
```
print-renderer.html (line ~1202)
```

**Test Script:**
```
test-vertical-choonpu-rotation.js
```

**Output Directory:**
```
debug-output/vertical-choonpu-test/
```

---

**Last Updated:** October 25, 2025  
**Status:** ✅ Implemented and Tested

