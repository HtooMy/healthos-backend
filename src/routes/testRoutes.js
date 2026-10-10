const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    status: 'ok',
    app: 'HealthOS backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

router.get('/db-status', (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    ok: true,
    database: {
      state: states[mongoose.connection.readyState] || 'unknown',
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
  });
});

router.post('/echo', (req, res) => {
  res.status(200).json({
    ok: true,
    received: req.body || {},
    headers: {
      'content-type': req.headers['content-type'] || null,
    },
  });
});

module.exports = router;
