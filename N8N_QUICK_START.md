# 🚀 N8N is Starting - Quick Action Guide

## ✅ What Just Happened
- N8N installation completed successfully
- N8N server is now starting up on http://localhost:5678

## 📋 Next Steps (Do These Now!)

### Step 1: Wait for N8N to Fully Start
Watch the terminal - wait for the message:
```
n8n ready on http://localhost:5678
```

This may take 1-2 minutes on first run.

### Step 2: Open N8N in Browser
Once you see the "ready" message, open:
```
http://localhost:5678
```

### Step 3: Create Admin Account
You'll see a setup wizard. Complete it with:
- **Email**: your-email@example.com (or any email)
- **Password**: Create a strong password

### Step 4: Configure OpenAI Credential
After login:
1. Click **Settings** (gear icon, top right)
2. Select **Credentials**
3. Click **"+ Add Credential"**
4. Search for **"OpenAI"**
5. Click it
6. Enter your **OpenAI API Key**
   - Get it from: https://platform.openai.com/api-keys
7. Click **Save**

### Step 5: Create Master Workflow
1. Click **Workflows** (left sidebar)
2. Click **"+ New"**
3. Name it: **full-analysis-workflow**
4. Now you'll see the workflow editor

### Step 6: Build the Workflow
Drag these nodes into the canvas:

**Node 1: Webhook (Trigger)**
- Search for "Webhook" node
- Drag it to canvas
- In settings:
  - Method: POST
  - Path: full-analysis-workflow
- Leave other settings as default

**Node 2: Code** 
- Search for "Code" node (looks like <> symbol)
- Drag it to canvas
- In the code editor, paste this template:

```javascript
// Get papers from webhook input
const papers = $input.all()[0].json.papers || [];
const question = $input.all()[0].json.question || "What are the key findings?";

// Return mock results for testing
return {
  status: 'success',
  module1: {
    summaries: papers.map((p, i) => ({
      paperId: p.id,
      title: p.title,
      summary: `Summary of "${p.title}"...`
    }))
  },
  module2: {
    topics: [
      { id: "topic_1", name: "Machine Learning", keywords: ["ML", "AI"], coherence: 0.85 },
      { id: "topic_2", name: "Data Science", keywords: ["data", "stats"], coherence: 0.78 }
    ],
    assignments: papers.map((p, i) => ({
      paperId: p.id,
      topicId: `topic_${i % 2 + 1}`
    }))
  },
  module3: {
    gaps: [
      {
        gapId: "gap_1",
        topicA: "topic_1",
        topicB: "topic_2",
        topicALabel: "Machine Learning",
        topicBLabel: "Data Science",
        gapScore: 0.72,
        similarity: 0.65,
        coOccurrence: 3
      }
    ]
  },
  module4: { trends: [] },
  module5: { visualization: {} },
  module6: { gapEvidences: [] },
  module7: { contradictions: [] },
  module8: { matrix: {} },
  module9: { relatedWork: [] },
  module10: { honestyScore: 0.82 },
  reportTitle: "Research Analysis Report",
  reportSummary: "Analysis completed successfully",
  reportMarkdown: "# Report\n\nContent here...",
  reportHighlights: ["Finding 1", "Finding 2"],
  confidence: 0.85,
  processingTimeMs: 45000
};
```

**Node 3: Respond to Webhook**
- Search for "Respond to Webhook" node
- Drag it to canvas
- Leave settings as default

### Step 7: Connect the Nodes
- Click the **small dot on the right** of the Webhook node
- Drag a **line** to the left of the Code node
- Do the same: Code node → Respond to Webhook node
- You should see: **Webhook → Code → Respond to Webhook**

### Step 8: Save the Workflow
- Click **Save** button (top right)
- Confirm the workflow is saved

### Step 9: Test the Workflow
Open a new terminal (not the one running n8n) and run:

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
    "question": "What are key findings?"
  }'
```

You should get back a JSON response with all the modules!

### Step 10: Configure Backend
In a third terminal, go to your backend folder:

```bash
cd backend
```

Copy the environment file:
```bash
cp .env.example.n8n .env
```

Edit `.env` and update these lines:
```
N8N_BASE_URL=http://localhost:5678
OPENAI_API_KEY=sk-proj-xxx...  # Your actual key
```

Save and restart backend:
```bash
npm run dev
```

### Step 11: Test from Frontend
1. Go to frontend dashboard
2. Upload some papers
3. Click "Analyze"
4. ✨ Notice: **No more "Choose Analysis Type" dialog!**
5. Analysis should run through N8N
6. Results appear automatically

---

## 🎯 Summary

You now have:
- ✅ N8N running on http://localhost:5678
- ✅ Admin account created
- ✅ full-analysis-workflow ready
- ✅ Backend configured to use N8N
- ✅ Frontend integrated with N8N

## 📞 If Something Goes Wrong

**Terminal 1 (N8N running):**
- Keep running - don't close it
- Watch for errors in the output

**N8N won't start:**
```bash
# Kill the process
taskkill /PID <PID> /F

# Try again
n8n start
```

**Can't access http://localhost:5678:**
- Wait 2-3 minutes (first startup is slow)
- Check terminal 1 for error messages
- Verify port 5678 is free

**Webhook test fails:**
- Make sure workflow is saved
- Check webhook path is exact: `full-analysis-workflow`
- Look at N8N UI for execution logs

---

## ✨ Success Checklist

- [ ] N8N running and showing "ready" message
- [ ] Can access http://localhost:5678
- [ ] Admin account created
- [ ] OpenAI credential added
- [ ] full-analysis-workflow created
- [ ] Nodes connected properly
- [ ] Workflow saved
- [ ] Curl test returns JSON
- [ ] Backend .env updated
- [ ] Backend restarted
- [ ] Frontend shows no dialog
- [ ] Analysis completes successfully

Good luck! You're almost there! 🎉
