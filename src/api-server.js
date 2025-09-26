const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const dns = require('dns').promises;
const dgram = require('dgram');
const packet = require('dns-packet');
const RuleManager = require('./rule-manager');
const DomainFilter = require('./domain-filter');
const logger = require('./logger');
const database = require('./database');
const deviceTracker = require('./device-tracker');
const NetworkEnforcer = require('./network-enforcer');
const privacyManager = require('./privacy-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3001;
const DNS_PORT = 53;

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Initialize services
const ruleManager = new RuleManager();
const domainFilter = new DomainFilter();
const networkEnforcer = new NetworkEnforcer();

// Statistics tracking
const stats = {
  totalQueries: 0,
  blockedQueries: 0,
  allowedQueries: 0,
  queryHistory: [],
  topBlockedDomains: {},
  topAllowedDomains: {},
  deviceStats: {}
};

// DNS Server
const dnsServer = dgram.createSocket('udp4');

async function resolveDNS(domain) {
  try {
    const addresses = await dns.resolve4(domain);
    return addresses[0];
  } catch (error) {
    console.error(`Failed to resolve ${domain}:`, error.message);
    return '0.0.0.0';
  }
}

dnsServer.on('message', async (msg, rinfo) => {
  try {
    const query = packet.decode(msg);
    const domain = query.questions[0]?.name;

    if (!domain) return;

    stats.totalQueries++;

    // Check if domain should be blocked using both RuleManager and DomainFilter
    const isBlockedByRules = await ruleManager.isBlocked(domain, rinfo.address);
    const isBlockedByFilter = domainFilter.isBlocked(domain);
    const isBlocked = isBlockedByRules || isBlockedByFilter;
    const action = isBlocked ? 'blocked' : 'allowed';

    // Log blocking decision with privacy
    if (isBlocked) {
      const anonymizedIP = privacyManager.anonymizeIP(rinfo.address);
      console.log(`🚫 Blocking ${domain} from ${anonymizedIP}`);
    }

    // Update statistics
    if (isBlocked) {
      stats.blockedQueries++;
      stats.topBlockedDomains[domain] = (stats.topBlockedDomains[domain] || 0) + 1;
    } else {
      stats.allowedQueries++;
      stats.topAllowedDomains[domain] = (stats.topAllowedDomains[domain] || 0) + 1;
    }

    // Track device with enhanced tracking
    const deviceUpdate = deviceTracker.getRealtimeUpdate(rinfo.address, domain, action);

    // Update local stats
    const deviceKey = rinfo.address;
    if (!stats.deviceStats[deviceKey]) {
      stats.deviceStats[deviceKey] = {
        ip: rinfo.address,
        queries: 0,
        blocked: 0,
        allowed: 0
      };
    }
    stats.deviceStats[deviceKey].queries++;
    stats.deviceStats[deviceKey][isBlocked ? 'blocked' : 'allowed']++;

    // Add to history with privacy protection
    const historyEntry = privacyManager.sanitizeLogEntry({
      timestamp: new Date().toISOString(),
      domain,
      clientIp: rinfo.address,
      action: action,
      device: deviceTracker.getDevice(rinfo.address),
      deviceName: deviceUpdate.device.name
    });

    stats.queryHistory.unshift(historyEntry);
    if (stats.queryHistory.length > 1000) {
      stats.queryHistory = stats.queryHistory.slice(0, 1000);
    }

    // Log the query
    logger.logDNSQuery({
      domain,
      clientIp: rinfo.address,
      blocked: isBlocked
    });

    // Emit multiple real-time updates
    io.emit('dns-query', historyEntry);
    io.emit('device-activity', deviceUpdate);
    io.emit('stats-update', getStats());

    // Prepare DNS response
    const response = packet.encode({
      id: query.id,
      type: 'response',
      flags: packet.RECURSION_DESIRED | packet.RECURSION_AVAILABLE,
      questions: query.questions,
      answers: [{
        name: domain,
        type: 'A',
        ttl: 300,
        data: isBlocked ? '0.0.0.0' : await resolveDNS(domain)
      }]
    });

    dnsServer.send(response, rinfo.port, rinfo.address);
  } catch (error) {
    console.error('DNS error:', error);
  }
});

// Helper function to get formatted stats
function getStats() {
  return {
    ...stats,
    topBlockedDomains: Object.entries(stats.topBlockedDomains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count })),
    topAllowedDomains: Object.entries(stats.topAllowedDomains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count })),
    devices: Object.values(stats.deviceStats)
  };
}

// API Routes

// Dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    // Get stats from database if available
    if (database.isInitialized()) {
      const dbStats = await ruleManager.getStats();
      const localStats = getStats();
      res.json({
        ...localStats,
        database: {
          connected: true,
          ...dbStats
        }
      });
    } else {
      res.json({
        ...getStats(),
        database: {
          connected: false
        }
      });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Rules management
app.get('/api/rules', (req, res) => {
  res.json(ruleManager.getRules());
});

app.post('/api/rules', (req, res) => {
  const rule = ruleManager.addRule(req.body);
  io.emit('rules-update', ruleManager.getRules());
  res.json(rule);
});

app.put('/api/rules/:id', (req, res) => {
  const updated = ruleManager.updateRule(req.params.id, req.body);
  if (updated) {
    io.emit('rules-update', ruleManager.getRules());
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Rule not found' });
  }
});

app.delete('/api/rules/:id', (req, res) => {
  const deleted = ruleManager.deleteRule(req.params.id);
  if (deleted) {
    io.emit('rules-update', ruleManager.getRules());
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Rule not found' });
  }
});

// Blocked domains management
app.get('/api/blocked-domains', (req, res) => {
  res.json(domainFilter.getBlockedDomains());
});

app.post('/api/blocked-domains', async (req, res) => {
  const { domain } = req.body;

  // Add to domain filter
  domainFilter.blockDomain(domain);

  // Add to database if available
  if (database.isInitialized()) {
    try {
      await database.addBlockedDomain(domain, 'manual', 'api');
    } catch (error) {
      console.error('Failed to save to database:', error);
    }
  }

  console.log(`✅ Added ${domain} to blocked list`);

  io.emit('blocked-domains-update', domainFilter.getBlockedDomains());
  res.json({ success: true, message: `${domain} is now blocked` });
});

app.delete('/api/blocked-domains/:domain', (req, res) => {
  domainFilter.unblockDomain(req.params.domain);
  io.emit('blocked-domains-update', domainFilter.getBlockedDomains());
  res.json({ success: true });
});

// Query history
app.get('/api/history', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  res.json({
    total: stats.queryHistory.length,
    items: stats.queryHistory.slice(offset, offset + limit)
  });
});

// Clear statistics
app.post('/api/stats/clear', (req, res) => {
  stats.totalQueries = 0;
  stats.blockedQueries = 0;
  stats.allowedQueries = 0;
  stats.queryHistory = [];
  stats.topBlockedDomains = {};
  stats.topAllowedDomains = {};
  stats.deviceStats = {};
  io.emit('stats-update', getStats());
  res.json({ success: true });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data
  socket.emit('initial-data', {
    stats: getStats(),
    rules: ruleManager.getRules(),
    blockedDomains: domainFilter.getBlockedDomains()
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Database status endpoint
app.get('/api/database/status', (req, res) => {
  res.json({
    connected: database.isInitialized(),
    provider: database.isInitialized() ? 'Supabase' : 'Local Storage',
    features: {
      realtime: database.isInitialized(),
      persistence: database.isInitialized(),
      logging: database.isInitialized()
    }
  });
});

// Access logs endpoint
app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const logs = await ruleManager.getAccessLog();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Device management endpoints
app.get('/api/devices', (req, res) => {
  const devices = deviceTracker.getAllDevices();
  res.json(devices);
});

app.get('/api/devices/active', (req, res) => {
  const activeDevices = deviceTracker.getActiveDevices();
  res.json(activeDevices);
});

app.get('/api/devices/:ip', (req, res) => {
  const device = deviceTracker.getDeviceStats(req.params.ip);
  if (device) {
    res.json(device);
  } else {
    res.status(404).json({ error: 'Device not found' });
  }
});

app.put('/api/devices/:ip/name', (req, res) => {
  const { name } = req.body;
  deviceTracker.setDeviceName(req.params.ip, name);
  res.json({ success: true, name });
});

// Network info endpoint
app.get('/api/network', (req, res) => {
  const networkInfo = deviceTracker.getNetworkInfo();
  res.json({
    interfaces: networkInfo,
    dnsServer: `${networkInfo[0]?.ip || 'localhost'}:${DNS_PORT}`,
    instructions: {
      mobile: 'Set this IP as your DNS server in WiFi settings',
      router: 'Configure your router to use this DNS server',
      device: 'Change DNS settings to point to this server'
    }
  });
});

// Privacy endpoints
app.get('/api/privacy/settings', (req, res) => {
  res.json(privacyManager.getPrivacySettings());
});

app.put('/api/privacy/settings', (req, res) => {
  const { mode } = req.body;
  if (privacyManager.setPrivacyMode(mode)) {
    res.json({ success: true, settings: privacyManager.getPrivacySettings() });
  } else {
    res.status(400).json({ error: 'Invalid privacy mode' });
  }
});

app.post('/api/privacy/clear', (req, res) => {
  privacyManager.clearPrivateData();
  stats.queryHistory = [];
  stats.deviceStats = {};
  res.json({ success: true, message: 'Private data cleared' });
});

// Network enforcement endpoints
app.get('/api/network/status', async (req, res) => {
  const status = networkEnforcer.getStatus();
  res.json(status);
});

app.get('/api/network/config', async (req, res) => {
  await networkEnforcer.detectNetworkSetup();
  const config = networkEnforcer.networkConfig;
  res.json(config);
});

app.post('/api/network/register', async (req, res) => {
  try {
    const { networkName, autoEnforce } = req.body;
    const result = await networkEnforcer.registerNetwork(networkName);

    if (autoEnforce) {
      await networkEnforcer.enableAutomaticEnforcement();
    }

    io.emit('network-registered', { networkName });
    res.json(result);
  } catch (error) {
    console.error('Failed to register network:', error);
    res.status(500).json({ error: 'Failed to register network' });
  }
});

app.post('/api/network/enforce', async (req, res) => {
  try {
    const result = await networkEnforcer.enableAutomaticEnforcement();
    io.emit('enforcement-status', { enforcing: result.success });
    res.json(result);
  } catch (error) {
    console.error('Failed to enable enforcement:', error);
    res.status(500).json({ error: 'Failed to enable enforcement' });
  }
});

app.post('/api/network/disable-enforcement', async (req, res) => {
  try {
    const result = await networkEnforcer.disableEnforcement();
    io.emit('enforcement-status', { enforcing: false });
    res.json(result);
  } catch (error) {
    console.error('Failed to disable enforcement:', error);
    res.status(500).json({ error: 'Failed to disable enforcement' });
  }
});

// Start servers
dnsServer.bind(DNS_PORT, async () => {
  console.log(`DNS server running on port ${DNS_PORT}`);
  if (database.isInitialized()) {
    console.log('✅ Supabase database connected');

    // Load blocked domains from database
    try {
      const blockedDomains = await database.getBlockedDomains();

      if (blockedDomains && blockedDomains.length > 0) {
        blockedDomains.forEach(item => {
          domainFilter.blockDomain(item.domain);
          console.log(`📝 Loaded blocked domain: ${item.domain}`);
        });
        console.log(`✅ Loaded ${blockedDomains.length} blocked domains from database`);
      }
    } catch (error) {
      console.error('Failed to load blocked domains from database');
    }
  } else {
    console.log('⚠️ Using local storage (configure Supabase in .env for persistence)');
  }

  // Initialize network enforcer
  await networkEnforcer.initialize();
  console.log('🛡️ Network enforcer initialized');
});

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready for connections`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  dnsServer.close();
  server.close();
  process.exit(0);
});

module.exports = { app, server, io };