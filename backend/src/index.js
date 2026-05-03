require('dotenv').config();
const app = require('./app');
const connectDB = require('./db/mongoose');
const { seedBaseCorpus } = require('./services/corpusSeeder');

const PORT = Number(process.env.PORT || 4000);

function startServer(dbSuffix = '') {
  app.listen(PORT, () => {
    console.log(`ResearchLens backend running on http://localhost:${PORT}${dbSuffix}`);
  });
}

connectDB()
  .then(async () => {
    startServer();
    await seedBaseCorpus();
  })
  .catch((err) => {
    console.warn(`⚠️  MongoDB connection failed: ${err.message}`);
    console.warn('Starting server without database — auth endpoints will not work.');
    startServer(' (no DB)');
  });
