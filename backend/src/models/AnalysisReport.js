const mongoose = require('mongoose');

const analysisReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    
    // Paper info
    paperIds: [{ type: String }],
    paperCount: { type: Number, default: 0 },
    yearRange: {
      start: { type: Number, default: null },
      end: { type: Number, default: null },
    },
    
    // Module results
    module1: { type: mongoose.Schema.Types.Mixed, default: null }, // Summarization
    module2: { type: mongoose.Schema.Types.Mixed, default: null }, // Topic Modeling
    module3: { type: mongoose.Schema.Types.Mixed, default: null }, // Gap Detection
    module4: { type: mongoose.Schema.Types.Mixed, default: null }, // Trend Detection
    module5: { type: mongoose.Schema.Types.Mixed, default: null }, // Visualization
    module6: { type: mongoose.Schema.Types.Mixed, default: null }, // Chatbot
    module7: { type: mongoose.Schema.Types.Mixed, default: null }, // Contradiction Detection
    module8: { type: mongoose.Schema.Types.Mixed, default: null }, // Dataset/Method Matrix
    module9: { type: mongoose.Schema.Types.Mixed, default: null }, // Related Work
    
    // Computed metadata
    topicCount: { type: Number, default: 0 },
    gapCount: { type: Number, default: 0 },
    qualityScore: { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: 0 },
    
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnalysisReport', analysisReportSchema);
