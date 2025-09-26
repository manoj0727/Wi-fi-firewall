const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFile = 'firewall.log') {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.logFile = path.join(this.logDir, logFile);
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      level,
      message,
      ...meta
    });
  }

  writeLog(level, message, meta) {
    const logEntry = this.formatMessage(level, message, meta);

    console.log(logEntry);

    fs.appendFile(this.logFile, logEntry + '\n', (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  info(message, meta) {
    this.writeLog('INFO', message, meta);
  }

  error(message, meta) {
    this.writeLog('ERROR', message, meta);
  }

  warn(message, meta) {
    this.writeLog('WARN', message, meta);
  }

  debug(message, meta) {
    this.writeLog('DEBUG', message, meta);
  }

  query(domain, result, ip) {
    this.writeLog('QUERY', `DNS query for ${domain}`, {
      domain,
      result,
      ip,
      timestamp: this.getTimestamp()
    });
  }
}

module.exports = new Logger();