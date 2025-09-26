const redis = require('redis');
const fs = require('fs').promises;
const path = require('path');
const database = require('./database');

class RuleManager {
  constructor() {
    this.rules = {
      blocked: new Set(),
      allowed: new Set(),
      categories: {
        social: ['facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com'],
        streaming: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com'],
        gaming: ['steam.com', 'epicgames.com', 'roblox.com', 'minecraft.net'],
        adult: [],
        ads: ['doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'adsystem.com']
      },
      blockedCategories: new Set(),
      mode: 'blacklist'
    };
    this.cache = new Map();
    this.accessLog = [];
    this.initServices();
  }

  async initServices() {
    await this.initRedis();
    await this.loadRules();

    // Subscribe to real-time updates if Supabase is available
    if (database.isInitialized()) {
      database.subscribeToBlockedDomains(async (payload) => {
        await this.syncFromDatabase();
        this.clearCache();
      });

      // Initial sync with database
      await this.syncFromDatabase();
    }
  }

  async initRedis() {
    try {
      this.redisClient = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      });

      this.redisClient.on('error', () => {
        if (!this.redisErrorLogged) {
          console.log('Redis not available, using memory cache');
          this.redisErrorLogged = true;
        }
        this.redisClient = null;
      });

      await this.redisClient.connect().catch(() => {
        console.log('Redis not available, using memory cache only');
        this.redisClient = null;
      });
    } catch (error) {
      console.log('Redis initialization failed, using memory cache');
      this.redisClient = null;
    }
  }

  async syncFromDatabase() {
    if (!database.isInitialized()) return;

    try {
      // Sync blocked domains
      const blockedDomains = await database.getBlockedDomains();
      this.rules.blocked = new Set(blockedDomains.map(d => d.domain));

      // Sync allowed domains
      const allowedDomains = await database.getAllowedDomains();
      this.rules.allowed = new Set(allowedDomains.map(d => d.domain));

      // Sync categories
      const categories = await database.getCategories();
      const enabledCategories = await database.getEnabledCategories();

      categories.forEach(cat => {
        if (cat.domains && cat.domains.length > 0) {
          this.rules.categories[cat.name] = cat.domains;
        }
      });

      this.rules.blockedCategories = new Set(enabledCategories.map(c => c.name));

      // Sync mode setting
      const mode = await database.getSetting('filter_mode');
      if (mode) {
        this.rules.mode = mode;
      }

      console.log('Synced rules from database');
    } catch (error) {
      console.error('Error syncing from database:', error);
    }
  }

  async loadRules() {
    // First try to load from database
    if (database.isInitialized()) {
      await this.syncFromDatabase();
      return;
    }

    // Fallback to file-based storage
    try {
      const rulesPath = path.join(__dirname, '../data/rules.json');
      const data = await fs.readFile(rulesPath, 'utf8');
      const loaded = JSON.parse(data);
      this.rules.blocked = new Set(loaded.blocked || []);
      this.rules.allowed = new Set(loaded.allowed || []);
      this.rules.blockedCategories = new Set(loaded.blockedCategories || []);
      this.rules.mode = loaded.mode || 'blacklist';
    } catch (error) {
      await this.saveRules();
    }
  }

  async saveRules() {
    // Save to database if available
    if (database.isInitialized()) {
      // Mode is saved through setSetting
      await database.setSetting('filter_mode', this.rules.mode);

      // Categories are managed through the database
      for (const categoryName of this.rules.blockedCategories) {
        if (this.rules.categories[categoryName]) {
          await database.updateCategory(
            categoryName,
            this.rules.categories[categoryName],
            true
          );
        }
      }

      return;
    }

    // Fallback to file-based storage
    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });

    const rulesPath = path.join(dataDir, 'rules.json');
    const data = {
      blocked: Array.from(this.rules.blocked),
      allowed: Array.from(this.rules.allowed),
      blockedCategories: Array.from(this.rules.blockedCategories),
      mode: this.rules.mode
    };

    await fs.writeFile(rulesPath, JSON.stringify(data, null, 2));
  }

  async isBlocked(domain, ipAddress = null) {
    const cacheKey = `block:${domain}`;

    if (this.cache.has(cacheKey)) {
      const result = this.cache.get(cacheKey);
      // Log to database if available
      if (database.isInitialized()) {
        await database.logAccess(domain, result ? 'blocked' : 'allowed', ipAddress);
      }
      return result;
    }

    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached !== null) {
          const result = cached === 'true';
          this.cache.set(cacheKey, result);
          if (database.isInitialized()) {
            await database.logAccess(domain, result ? 'blocked' : 'allowed', ipAddress);
          }
          return result;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    // Check database first if available
    if (database.isInitialized()) {
      const dbBlocked = await database.isDomainBlocked(domain);
      if (dbBlocked) {
        this.cache.set(cacheKey, true);
        await database.logAccess(domain, 'blocked', ipAddress);
        return true;
      }
    }

    let isBlocked = false;

    // Check categories
    for (const category of this.rules.blockedCategories) {
      if (this.rules.categories[category]) {
        for (const site of this.rules.categories[category]) {
          if (domain.includes(site)) {
            isBlocked = true;
            break;
          }
        }
      }
    }

    // Check blocked list
    if (!isBlocked) {
      for (const blockedDomain of this.rules.blocked) {
        if (domain.includes(blockedDomain)) {
          isBlocked = true;
          break;
        }
      }
    }

    // Check whitelist mode
    if (this.rules.mode === 'whitelist') {
      isBlocked = true;
      for (const allowedDomain of this.rules.allowed) {
        if (domain.includes(allowedDomain)) {
          isBlocked = false;
          break;
        }
      }
    }

    this.cache.set(cacheKey, isBlocked);
    if (this.cache.size > 10000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    if (this.redisClient) {
      try {
        await this.redisClient.setEx(cacheKey, 300, String(isBlocked));
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }

    // Log to database
    if (database.isInitialized()) {
      await database.logAccess(domain, isBlocked ? 'blocked' : 'allowed', ipAddress);
    }

    return isBlocked;
  }

  async addBlockedSite(domain, ipAddress = null) {
    // Add to database if available
    if (database.isInitialized()) {
      const result = await database.addBlockedDomain(domain, null, ipAddress);
      if (result.success) {
        this.rules.blocked.add(domain);
        this.clearCache();
      }
      return result;
    }

    // Fallback to local storage
    this.rules.blocked.add(domain);
    this.clearCache();
    await this.saveRules();
    return { success: true };
  }

  async removeBlockedSite(domain) {
    // Remove from database if available
    if (database.isInitialized()) {
      const result = await database.removeBlockedDomain(domain);
      if (result.success) {
        this.rules.blocked.delete(domain);
        this.clearCache();
      }
      return result;
    }

    // Fallback to local storage
    this.rules.blocked.delete(domain);
    this.clearCache();
    await this.saveRules();
    return { success: true };
  }

  async addAllowedSite(domain) {
    this.rules.allowed.add(domain);
    this.clearCache();
    await this.saveRules();
  }

  async removeAllowedSite(domain) {
    this.rules.allowed.delete(domain);
    this.clearCache();
    await this.saveRules();
  }

  async toggleCategory(category) {
    if (this.rules.blockedCategories.has(category)) {
      this.rules.blockedCategories.delete(category);
      if (database.isInitialized()) {
        await database.updateCategory(
          category,
          this.rules.categories[category] || [],
          false
        );
      }
    } else {
      this.rules.blockedCategories.add(category);
      if (database.isInitialized()) {
        await database.updateCategory(
          category,
          this.rules.categories[category] || [],
          true
        );
      }
    }
    this.clearCache();
    await this.saveRules();
  }

  async setMode(mode) {
    this.rules.mode = mode;
    if (database.isInitialized()) {
      await database.setSetting('filter_mode', mode);
    }
    this.clearCache();
    await this.saveRules();
  }

  clearCache() {
    this.cache.clear();
    if (this.redisClient) {
      try {
        this.redisClient.flushDb();
      } catch (error) {
        console.error('Redis flush error:', error);
      }
    }
  }

  async logAccess(domain, status, ipAddress = null) {
    const entry = {
      domain,
      status,
      timestamp: new Date().toISOString(),
      ip: ipAddress
    };

    this.accessLog.push(entry);
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }

    // Also log to database if available
    if (database.isInitialized()) {
      await database.logAccess(domain, status, ipAddress);
    }
  }

  async getAccessLog() {
    // Try to get from database first
    if (database.isInitialized()) {
      const logs = await database.getAccessLogs(100);
      if (logs.length > 0) {
        return logs;
      }
    }

    // Fallback to in-memory log
    return this.accessLog.slice(-100).reverse();
  }

  async getStats() {
    // Get stats from database if available
    if (database.isInitialized()) {
      return await database.getAccessStats(24);
    }

    // Calculate from in-memory log
    const stats = {
      total: this.accessLog.length,
      blocked: this.accessLog.filter(l => l.status === 'blocked').length,
      allowed: this.accessLog.filter(l => l.status === 'allowed').length
    };
    return stats;
  }

  getRules() {
    return {
      blocked: Array.from(this.rules.blocked),
      allowed: Array.from(this.rules.allowed),
      categories: this.rules.categories,
      blockedCategories: Array.from(this.rules.blockedCategories),
      mode: this.rules.mode,
      databaseConnected: database.isInitialized()
    };
  }
}

module.exports = RuleManager;