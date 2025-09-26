const redis = require('redis');
const fs = require('fs').promises;
const path = require('path');

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
    this.initRedis();
    this.loadRules();
  }

  async initRedis() {
    try {
      this.redisClient = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      });

      this.redisClient.on('error', (err) => {
        console.log('Redis error, falling back to memory cache:', err.message);
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

  async loadRules() {
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

  async isBlocked(domain) {
    const cacheKey = `block:${domain}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached !== null) {
          const result = cached === 'true';
          this.cache.set(cacheKey, result);
          return result;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    let isBlocked = false;

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

    if (!isBlocked) {
      for (const blockedDomain of this.rules.blocked) {
        if (domain.includes(blockedDomain)) {
          isBlocked = true;
          break;
        }
      }
    }

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

    return isBlocked;
  }

  async addBlockedSite(domain) {
    this.rules.blocked.add(domain);
    this.clearCache();
    await this.saveRules();
  }

  async removeBlockedSite(domain) {
    this.rules.blocked.delete(domain);
    this.clearCache();
    await this.saveRules();
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
    } else {
      this.rules.blockedCategories.add(category);
    }
    this.clearCache();
    await this.saveRules();
  }

  async setMode(mode) {
    this.rules.mode = mode;
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

  async logAccess(domain, status) {
    const entry = {
      domain,
      status,
      timestamp: new Date().toISOString(),
      ip: null
    };

    this.accessLog.push(entry);
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }
  }

  getAccessLog() {
    return this.accessLog.slice(-100).reverse();
  }

  getRules() {
    return {
      blocked: Array.from(this.rules.blocked),
      allowed: Array.from(this.rules.allowed),
      categories: this.rules.categories,
      blockedCategories: Array.from(this.rules.blockedCategories),
      mode: this.rules.mode
    };
  }
}

module.exports = { RuleManager };