const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static client files
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));
app.get('/recommend', (req, res) => res.sendFile(path.join(__dirname, '../client/recommend.html')));
app.get('/forum', (req, res) => res.sendFile(path.join(__dirname, '../client/forum.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../client/admin.html')));

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
