# Color Pattern Rendering Debug

## Test Results
✅ colorPattern flows through correctly:
- order-processor extracts it
- print-generator applies it  
- hasColorPattern: true is logged

## Potential Issue Identified

### The Problem
Looking at the rendering code in `print-renderer.html`, there's a potential issue with how we handle character positions.

**Current Logic (lines 1218-1248)**:
```javascript
if (hasColorPattern && position.line.length > 1) {
    // Render character by character with different colors
    for (let j = 0; j < position.line.length; j++) {
        const colorIndex = j % designParams.colorPattern.colors.length;
        // Apply color per character
    }
}
```

### The Bug
**Issue**: When `textCoordinates` are provided from the frontend, each character is typically in its own `position` object. This means `position.line.length === 1` for each position, causing our multi-color check to fail!

**Example**:
```javascript
// Frontend sends coordinates for "こんにちは"
layout.positions = [
  { line: "こ", x: 100, y: 200 },  // length = 1
  { line: "ん", x: 120, y: 200 },  // length = 1
  { line: "に", x: 140, y: 200 },  // length = 1
  // etc...
]
```

When we check `position.line.length > 1`, it's always false, so colorPattern never applies!

### The Fix
We need to track the character index ACROSS all positions, not just within each position.

## Solution Implementation

We need to:
1. Track a `globalCharIndex` across all positions
2. Apply colorPattern based on `globalCharIndex` even for single-character positions
3. Handle both single-character and multi-character positions

