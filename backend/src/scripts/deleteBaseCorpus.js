/**
 * Script to permanently delete all base corpus papers from MongoDB
 * Run with: node src/scripts/deleteBaseCorpus.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Paper = require('../models/Paper');

async function deleteBaseCorpus() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/researchlens');
    console.log('✅ Connected to MongoDB');

    console.log('Deleting all base corpus papers...');
    const result = await Paper.deleteMany({ isBaseCorpus: true });

    console.log(`✅ Deleted ${result.deletedCount} base corpus papers from database`);
    console.log('Base corpus has been permanently removed.');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting base corpus:', error.message);
    process.exit(1);
  }
}

deleteBaseCorpus();
