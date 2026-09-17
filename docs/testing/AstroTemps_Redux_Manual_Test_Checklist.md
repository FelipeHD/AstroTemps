# AstroTemps Redux — Manual PixInsight Acceptance Checklist

Use this checklist before promoting Redux to the public `pixinsight-update-repository` branch. Record the actual PixInsight/plugin versions and preserve a console excerpt or file reference for every case.

## Test environment

- PixInsight version: ______________________________
- AstroTemps version / commit: ____________________
- BlurXTerminator version: _________________________
- NoiseXTerminator version: ________________________
- StarXTerminator version: _________________________
- StarNet2 version: ________________________________
- SetiAstro / SASpro version: ______________________
- GraXpert version: ________________________________
- Test date: _______________________________________

## Runtime cases

### 1. Active-view all-primary success
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 2. Process Icon drag all-primary success
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 3. Original image pixel data remains unchanged
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 4. SPCC success produces Linked stretch
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 5. Skip SPCC bypasses ImageSolver/SPCC and produces Unlinked stretch
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 6. Gaia DR3/SP failure displays friendly guidance
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 7. BlurX Correct failure falls back to SASpro Correct
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 8. SetiAstro AutoDBE failure falls back to GraXpert
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 9. BlurX Sharpen failure falls back to SASpro Sharpen
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 10. StarX failure falls back to StarNet2 and still creates `*_Redux_stars`
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 11. NoiseX failure falls back to SASpro Denoise
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 12. Primary + fallback failure stops at the named stage
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 13. Star Removal occurs before Noise Reduction in the console log
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 14. Final `*_Redux` remains open
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 15. `*_Redux_stars` remains open
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 16. Original remains open
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

### 17. Final Screen blend completes without closing the stars image
- [ ] PASS
- [ ] FAIL
- PixInsight version: ______________________________
- Plugin versions: _________________________________
- Console excerpt / file reference: ________________

## Acceptance

- [ ] All 17 runtime cases passed.
- [ ] No unexpected windows/process dialogs appeared other than the Redux capture-filter/SPCC dialog and intentional error guidance.
- [ ] The public `pixinsight-update-repository` branch has not been modified during testing.
- [ ] Release version has not been changed without explicit approval.
