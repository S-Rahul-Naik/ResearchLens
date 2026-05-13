const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema(
  {
    paperId: { type: String, required: true, unique: true },
    title: { type: String, default: '' },
    authors: { type: [String], default: [] },
    year: { type: Number, default: null },
    abstract: { type: String, default: '' },
    content: { type: String, default: '' }, // legacy: raw PDF text
    keywords: { type: [String], default: [] },
    venue: { type: String, default: '' },
    doi: { type: String, default: '' },
    cloudinaryUrl: { type: String, default: '' },
    cloudinaryPublicId: { type: String, default: '' },
    // true for the shared 20 base-corpus papers; false for user uploads
    isBaseCorpus: { type: Boolean, default: false },
    // null for base-corpus papers; ObjectId of the owner for user uploads
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Structured paper sections for LLM reasoning
    fullText: {
      introduction: { type: String, default: '' },
      methodology: { type: String, default: '' },
      results: { type: String, default: '' },
      conclusion: { type: String, default: '' },
      references: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Paper', paperSchema);
