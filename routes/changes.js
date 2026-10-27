// Role: live updates. GET /api/changes returns the database revision, a number that
// triggers in db/schema.sql raise on every write. The browser's background worker
// (public/live-worker.js) asks every 5 seconds and reloads only when the number changed.
// Because the number lives in the database, it works across tabs, devices and several
// server instances that share the same database file.
const express = require('express');

module.exports = function changesRouter(db) {
  const router = express.Router();
  const getRevision = db.prepare("SELECT value FROM app_meta WHERE key = 'revision'");

  router.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store');          // always ask the database, never a cache
    res.json({ revision: getRevision.get().value, checked_at: new Date().toISOString() });
  });

  return router;
};
