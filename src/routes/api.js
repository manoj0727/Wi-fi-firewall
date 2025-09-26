const express = require('express');

module.exports = function(ruleManager) {
  const router = express.Router();

  router.get('/rules', (req, res) => {
    res.json(ruleManager.getRules());
  });

  router.post('/rules/block', async (req, res) => {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    await ruleManager.addBlockedSite(domain);
    res.json({ success: true, message: `${domain} has been blocked` });
  });

  router.delete('/rules/block/:domain', async (req, res) => {
    const { domain } = req.params;
    await ruleManager.removeBlockedSite(domain);
    res.json({ success: true, message: `${domain} has been unblocked` });
  });

  router.post('/rules/allow', async (req, res) => {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    await ruleManager.addAllowedSite(domain);
    res.json({ success: true, message: `${domain} has been allowed` });
  });

  router.delete('/rules/allow/:domain', async (req, res) => {
    const { domain } = req.params;
    await ruleManager.removeAllowedSite(domain);
    res.json({ success: true, message: `${domain} removed from allowed list` });
  });

  router.post('/rules/category/:category', async (req, res) => {
    const { category } = req.params;
    await ruleManager.toggleCategory(category);
    res.json({ success: true });
  });

  router.post('/rules/mode', async (req, res) => {
    const { mode } = req.body;
    if (!['blacklist', 'whitelist'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }
    await ruleManager.setMode(mode);
    res.json({ success: true, mode });
  });

  router.get('/logs', (req, res) => {
    res.json(ruleManager.getAccessLog());
  });

  router.post('/test', async (req, res) => {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    const isBlocked = await ruleManager.isBlocked(domain);
    res.json({ domain, isBlocked });
  });

  return router;
};