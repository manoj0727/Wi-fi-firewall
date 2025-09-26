const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DataProtector {
  constructor() {
    this.masterKey = this.generateOrLoadMasterKey();
    this.dataDir = path.join(__dirname, '..', 'data');
    this.encryptedDataFile = path.join(this.dataDir, 'encrypted.vault');
    this.memoryOnlyMode = process.env.MEMORY_ONLY === 'true';
    this.strictMode = process.env.PRIVACY_MODE === 'strict';
    this.initializeProtection();
  }

  generateOrLoadMasterKey() {
    if (process.env.ENCRYPTION_KEY) {
      return crypto.createHash('sha256')
        .update(process.env.ENCRYPTION_KEY)
        .digest();
    }
    // Generate ephemeral key for this session
    return crypto.randomBytes(32);
  }

  async initializeProtection() {
    if (!this.memoryOnlyMode) {
      try {
        await fs.mkdir(this.dataDir, { recursive: true });
        // Set restrictive permissions on data directory
        await fs.chmod(this.dataDir, 0o700);
      } catch (error) {
        console.error('Could not create secure data directory');
      }
    }
  }

  // Encrypt data before storage
  encryptData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      timestamp: Date.now()
    };
  }

  // Decrypt data after retrieval
  decryptData(encryptedObj) {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.masterKey,
        Buffer.from(encryptedObj.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));

      let decrypted = decipher.update(encryptedObj.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed - data may be corrupted');
      return null;
    }
  }

  // Store data securely
  async storeSecurely(key, data) {
    if (this.memoryOnlyMode) {
      // Only keep in memory, don't persist
      return true;
    }

    const encrypted = this.encryptData({ key, data });

    try {
      // Read existing vault
      let vault = {};
      try {
        const vaultData = await fs.readFile(this.encryptedDataFile, 'utf8');
        vault = JSON.parse(vaultData);
      } catch (error) {
        // Vault doesn't exist yet
      }

      // Add encrypted data
      vault[key] = encrypted;

      // Write back
      await fs.writeFile(
        this.encryptedDataFile,
        JSON.stringify(vault),
        { mode: 0o600 } // Read/write for owner only
      );

      return true;
    } catch (error) {
      console.error('Failed to store data securely');
      return false;
    }
  }

  // Retrieve data securely
  async retrieveSecurely(key) {
    if (this.memoryOnlyMode) {
      return null;
    }

    try {
      const vaultData = await fs.readFile(this.encryptedDataFile, 'utf8');
      const vault = JSON.parse(vaultData);

      if (vault[key]) {
        const decrypted = this.decryptData(vault[key]);
        return decrypted ? decrypted.data : null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Secure delete - overwrite before deletion
  async secureDelete(key) {
    if (this.memoryOnlyMode) {
      return true;
    }

    try {
      const vaultData = await fs.readFile(this.encryptedDataFile, 'utf8');
      const vault = JSON.parse(vaultData);

      if (vault[key]) {
        // Overwrite with random data before deletion
        vault[key] = {
          encrypted: crypto.randomBytes(64).toString('hex'),
          iv: crypto.randomBytes(16).toString('hex'),
          authTag: crypto.randomBytes(16).toString('hex')
        };

        // Write overwritten data
        await fs.writeFile(this.encryptedDataFile, JSON.stringify(vault));

        // Now delete the key
        delete vault[key];

        // Write final version
        await fs.writeFile(this.encryptedDataFile, JSON.stringify(vault));
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Wipe all data securely
  async wipeAllData() {
    try {
      if (!this.memoryOnlyMode && await this.fileExists(this.encryptedDataFile)) {
        // Overwrite file multiple times with random data
        for (let i = 0; i < 3; i++) {
          const randomData = crypto.randomBytes(1024).toString('hex');
          await fs.writeFile(this.encryptedDataFile, randomData);
        }

        // Delete the file
        await fs.unlink(this.encryptedDataFile);
      }

      // Clear memory
      this.masterKey = crypto.randomBytes(32); // Replace key

      console.log('All data securely wiped');
      return true;
    } catch (error) {
      console.error('Failed to wipe data:', error);
      return false;
    }
  }

  async fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  // Anonymize sensitive data
  anonymizeData(data) {
    if (typeof data === 'object' && data !== null) {
      const anonymized = { ...data };

      // Anonymize IP addresses
      if (anonymized.ip || anonymized.clientIp) {
        const ip = anonymized.ip || anonymized.clientIp;
        if (ip.includes('.')) {
          const parts = ip.split('.');
          parts[3] = 'xxx';
          anonymized.ip = anonymized.clientIp = parts.join('.');
        }
      }

      // Hash domains if in strict mode
      if (this.strictMode && anonymized.domain) {
        anonymized.domain = crypto
          .createHash('sha256')
          .update(anonymized.domain)
          .digest('hex')
          .substring(0, 8) + '.hash';
      }

      // Remove device identifiers
      delete anonymized.deviceId;
      delete anonymized.mac;
      delete anonymized.hostname;

      return anonymized;
    }
    return data;
  }

  // Get privacy statistics
  getPrivacyStats() {
    return {
      encryptionEnabled: true,
      memoryOnlyMode: this.memoryOnlyMode,
      strictMode: this.strictMode,
      dataRetention: process.env.DATA_RETENTION_DAYS || '1',
      anonymization: process.env.ANONYMIZE_IPS === 'true',
      telemetryDisabled: process.env.NO_TELEMETRY === 'true',
      localOnly: process.env.LOCAL_ONLY === 'true'
    };
  }
}

module.exports = new DataProtector();