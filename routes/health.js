// Role: health check. GET /api/health returns { status: "ok" } so monitors and load
// balancers can tell the server is up. It does not touch the database.
const express = require('express');

module.exports = function healthRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store');          // always report the current state
    res.json({ status: 'ok' });
  });

  return router;
};
