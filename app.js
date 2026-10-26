// Role: builds the Express app from a database handle, so tests can use an
// in-memory database and server.js can use the real file.
const path = require('path');
const express = require('express');
const { ValidationError } = require('./services/calculator');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use('/api/entries', require('./routes/entries')(db));
  app.use('/api/factors', require('./routes/factors')(db));
  app.use('/api/targets', require('./routes/targets')(db));
  app.use('/api', require('./routes/reports')(db)); // /api/summary and /api/export.csv

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Central error handler keeps every error in the { error: "message" } shape.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' });
    if (err.type === 'entity.too.large') return res.status(400).json({ error: 'Request body too large' });
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
