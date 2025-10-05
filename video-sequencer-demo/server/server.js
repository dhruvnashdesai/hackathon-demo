require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ensureDirectoryExists } = require('./utils/fileHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

ensureDirectoryExists(path.join(__dirname, '..', 'uploads'));
ensureDirectoryExists(path.join(__dirname, '..', 'audio'));
ensureDirectoryExists(path.join(__dirname, 'public', 'converted'));
ensureDirectoryExists(path.join(__dirname, 'clips'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/audio', express.static(path.join(__dirname, '..', 'audio')));
app.use('/converted', express.static(path.join(__dirname, 'public', 'converted')));
app.use('/clips', express.static(path.join(__dirname, 'clips')));

const clipsRoutes = require('./routes/clips');
const sequenceRoutes = require('./routes/sequence');
const soundtrackRoutes = require('./routes/soundtrack');
const exportRoutes = require('./routes/export');
const assetsRoutes = require('./routes/assets');

app.use('/api/clips', clipsRoutes);
app.use('/api/sequence', sequenceRoutes);
app.use('/api/soundtrack', soundtrackRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/assets', assetsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});