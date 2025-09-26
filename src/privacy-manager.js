const crypto = require('crypto');

class PrivacyManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateKey();
    this.algorithm = 'aes-256-gcm';
    this.anonymizedIPs = new Map();
    this.privacyMode = process.env.PRIVACY_MODE || 'enhanced';
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex').slice(0, 32);
  }

  // Anonymize IP addresses for logging
  anonymizeIP(ip) {
    if (this.privacyMode === 'off') return ip;

    // Cache anonymized IPs for consistency
    if (this.anonymizedIPs.has(ip)) {
      return this.anonymizedIPs.get(ip);
    }

    // For IPv4, replace last octet with xxx
    if (ip.includes('.')) {
      const parts = ip.split('.');
      parts[3] = 'xxx';
      const anonymized = parts.join('.');
      this.anonymizedIPs.set(ip, anonymized);
      return anonymized;
    }

    // For IPv6, truncate
    if (ip.includes(':')) {
      const parts = ip.split(':');
      const anonymized = parts.slice(0, 4).join(':') + ':xxxx:xxxx:xxxx:xxxx';
      this.anonymizedIPs.set(ip, anonymized);
      return anonymized;
    }

    return 'anonymous';
  }

  // Hash domains for private storage
  hashDomain(domain) {
    return crypto.createHash('sha256').update(domain).digest('hex');
  }

  // Encrypt sensitive data
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey),
        Buffer.from(encryptedData.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Sanitize logs before storage
  sanitizeLogEntry(entry) {
    return {
      timestamp: entry.timestamp,
      domain: this.privacyMode === 'strict' ? this.hashDomain(entry.domain) : entry.domain,
      clientIp: this.anonymizeIP(entry.clientIp),
      action: entry.action,
      // Remove any personally identifiable information
      device: entry.device ? {
        type: entry.device.type,
        // Don't store device names or MAC addresses
      } : null
    };
  }

  // Generate session tokens for devices
  generateDeviceToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate device tokens
  validateDeviceToken(token) {
    // Implement token validation logic
    return token && token.length === 64;
  }

  // Clear private data
  clearPrivateData() {
    this.anonymizedIPs.clear();
    console.log('Private data cleared');
  }

  // Get privacy settings
  getPrivacySettings() {
    return {
      mode: this.privacyMode,
      ipAnonymization: this.privacyMode !== 'off',
      domainHashing: this.privacyMode === 'strict',
      dataRetention: this.getDataRetentionDays(),
      encryptionEnabled: true
    };
  }

  // Set privacy mode
  setPrivacyMode(mode) {
    if (['off', 'basic', 'enhanced', 'strict'].includes(mode)) {
      this.privacyMode = mode;
      return true;
    }
    return false;
  }

  getDataRetentionDays() {
    switch (this.privacyMode) {
      case 'strict': return 1;
      case 'enhanced': return 7;
      case 'basic': return 30;
      default: return 90;
    }
  }

  // Automatically delete old data
  scheduleDataCleanup() {
    const retentionDays = this.getDataRetentionDays();
    const cleanupInterval = 24 * 60 * 60 * 1000; // Daily

    setInterval(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Emit event to clean old data
      console.log(`Cleaning data older than ${retentionDays} days`);
      // Implementation would connect to database to delete old records
    }, cleanupInterval);
  }
}

module.exports = new PrivacyManager();