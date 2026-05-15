# N8N Integration - Empty Results Fix Guide

## Problem Summary
- ✅ N8N workflow completes successfully with valid JSON results
- ❌ Frontend receives empty/missing module data
- ❌ Images and results not showing on dashboard

## Root Causes Identified & Fixed

### 1. **Data Structure Mismatch in Webhook Handler**
**File:** `backend/src/routes/modules.js` (line ~1076)

**Problem:**
```javascript
// WRONG - trying to extract .topics from gapDetection
module2: gapDetection?.topics || { topics: [], assignments: [] },
module3: gapDetection || { gaps: [] },  // gets whole object instead of .gaps
```

**Fix:**
Now supports both response formats from n8n:
```javascript
module1: module1 || summarization || { summaries: [] },
module2: module2 || gapDetection?.topics || gapDetection?.module2 || { topics: [], assignments: [] },
module3: module3 || gapDetection?.gaps || gapDetection?.module3 || { gaps: [] },
```

### 2. **Improved N8N Result Formatting**
**File:** `backend/src/services/n8nBridge.js`

**Added:**
- Better logging to see actual response structure
- Support for both direct modules (module1-10) and legacy field names
- Proper fallbacks for all module data
- Debug console logs for troubleshooting

### 3. **Frontend Not Using Immediate Response**
**File:** `frontend/src/lib/api.ts`

**Problem:**
Frontend was ignoring the modules returned in the backend response and ONLY using polling, which caused:
- Race conditions
- Timeout delays
- Empty results if polling failed

**Fix:**
- Frontend now uses modules from immediate backend response
- Polling is fallback only
- Returns results immediately when available

---

## Testing & Verification

### Run Integration Test
```bash
# From project root
node test-n8n-integration.js
```

Or with authentication:
```bash
TEST_TOKEN="your-jwt-token" node test-n8n-integration.js
```

**Expected Output:**
```
✅ N8N Webhook responded with status 200
  module1.summaries: 5 items
  module2.topics: 4 items
  module3.gaps: 3 items

✅ Backend responded with status 200
  Response includes:
    - modules: ✅
    - analysisReport: ✅
    - reportId: ✅
```

### Manual Testing via curl

**Test N8N Directly:**
```bash
curl -X POST http://localhost:5678/webhook/full-analysis-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "papers": [{
      "id": "test-1",
      "title": "Test Paper",
      "abstract": "Test abstract",
      "content": "Test content",
      "authors": ["Author"],
      "year": 2024
    }],
    "question": "What are the key findings?"
  }'
```

**Test Backend N8N Analysis:**
```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:4000/api/modules/n8n-analysis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "papers": [{...}],
    "question": "What are the key findings?",
    "reportName": "Test Report"
  }'
```

---

## Debugging Steps

### 1. Check Console Logs
Look for lines starting with `[N8N]`:

```
[N8N] Trying workflow webhook: full-analysis-workflow
[N8N Analysis] Raw n8n response keys: [...]
[N8N Analysis] Formatted modules data: {module1Summaries: 5, ...}
[n8nAnalysisModules] Backend response received with modules
```

### 2. Verify N8N Health
```bash
# Check if N8N is responding
curl http://localhost:5678/health

# Or check alternative endpoint
curl http://localhost:5678/
```

### 3. Check Backend is Running
```bash
# Should return OK or module info
curl http://localhost:4000/health
```

### 4. Verify MongoDB
```bash
# Check if reports are being saved
mongosh
> use researchlens
> db.analysisreports.find().limit(1)
```

---

## Expected Data Flow

### Frontend → Backend → N8N → Backend → MongoDB → Frontend

```
1. Frontend calls n8nAnalysisModules()
   ↓
2. POST /api/modules/n8n-analysis
   ↓
3. Backend calls callN8NFullAnalysis()
   ↓
4. N8N webhook processes papers
   ↓
5. N8N returns: { module1, module2, module3, ... }
   ↓
6. formatN8NResults() converts to AnalysisReport schema
   ↓
7. Report saved to MongoDB
   ↓
8. Backend returns {modules, reportId, analysisReport}
   ↓
9. Frontend receives modules immediately
   ↓
10. Dashboard displays results with images
```

---

## If Still Getting Empty Results

### Check 1: N8N Response Format
Verify n8n is returning the correct structure:
```bash
curl -X POST http://localhost:5678/webhook/full-analysis-workflow \
  -H "Content-Type: application/json" \
  -d '{...}' | jq '.module1' # Should show summaries
```

### Check 2: Backend Logs
Restart backend with full logging:
```bash
cd backend
npm run dev 2>&1 | grep -E "\[N8N\]|ERROR"
```

### Check 3: Frontend Network Tab
Open browser DevTools → Network → analyze:
1. Check `/api/modules/n8n-analysis` response
2. Look for `modules` property in response
3. Check if it contains module data or is null/empty

### Check 4: MongoDB Data
```bash
mongosh researchlens
db.analysisreports.findOne({}, {projection: {module1: 1, module2: 1}})
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Empty modules in response** | N8N not returning data | Check n8n workflow completed; restart if needed |
| **Timeout waiting for report** | MongoDB slow or not saving | Verify MongoDB is running; check disk space |
| **Data mapping error** | Response structure mismatch | Check n8n output matches expected format |
| **403 Unauthorized** | Missing/invalid JWT token | Ensure authenticated request with valid token |
| **504 N8N unavailable** | N8N not running | Start n8n: `npm run n8n` |

---

## Performance Notes

- ✅ Backend now returns results immediately (no wait needed)
- ✅ Polling is fallback only (if modules missing from response)
- ✅ Typical response time: 30-60 seconds for n8n processing
- ⚠️ Long responses may take longer (depends on paper count)

---

## Next Steps

1. **Test with your papers:**
   ```bash
   # Upload papers to dashboard
   # Analyze with N8N workflow
   # Should see results + images immediately
   ```

2. **Monitor logs:**
   - Backend: `npm run dev` (watch for [N8N] logs)
   - N8N: Monitor execution in dashboard

3. **Report issues:**
   - Include `[N8N]` logs from console
   - Include error response from `/api/modules/n8n-analysis`
   - Include N8N workflow execution details

---

## Files Modified

- ✅ `backend/src/routes/modules.js` - Fixed webhook data mapping
- ✅ `backend/src/services/n8nBridge.js` - Enhanced result formatting
- ✅ `frontend/src/lib/api.ts` - Fixed immediate result handling
- ✅ `test-n8n-integration.js` - Added integration tests

---

**Need Help?**

Check console logs for `[N8N]` prefix messages for detailed debugging info.
