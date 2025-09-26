const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class DeviceTracker {
  constructor() {
    this.devices = new Map();
    this.lastSeen = new Map();
    this.deviceNames = new Map();
    this.initializeTracking();
  }

  initializeTracking() {
    // Scan for devices every 30 seconds
    setInterval(() => this.scanNetworkDevices(), 30000);
    this.scanNetworkDevices();
  }

  // Track device from DNS query
  trackDevice(ip, domain, action) {
    if (!this.devices.has(ip)) {
      this.devices.set(ip, {
        ip,
        firstSeen: new Date(),
        lastSeen: new Date(),
        hostname: null,
        deviceName: this.getDeviceName(ip),
        manufacturer: null,
        totalQueries: 0,
        blockedQueries: 0,
        allowedQueries: 0,
        recentDomains: [],
        status: 'active'
      });
    }

    const device = this.devices.get(ip);
    device.lastSeen = new Date();
    device.totalQueries++;

    if (action === 'blocked') {
      device.blockedQueries++;
    } else {
      device.allowedQueries++;
    }

    // Track recent domains
    device.recentDomains.unshift({
      domain,
      action,
      timestamp: new Date()
    });

    // Keep only last 50 domains
    if (device.recentDomains.length > 50) {
      device.recentDomains.pop();
    }

    this.lastSeen.set(ip, new Date());
    return device;
  }

  getDeviceName(ip) {
    // Try to identify device type based on IP patterns or MAC address
    const savedNames = this.deviceNames.get(ip);
    if (savedNames) return savedNames;

    // Default names based on IP
    const lastOctet = ip.split('.').pop();
    if (ip === '127.0.0.1' || ip === '::1') {
      return 'Local Server';
    } else if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return `Device ${lastOctet}`;
    }
    return `Unknown Device (${ip})`;
  }

  async scanNetworkDevices() {
    try {
      // Get network interfaces
      const interfaces = os.networkInterfaces();
      const localIPs = [];

      Object.values(interfaces).forEach(iface => {
        iface.forEach(details => {
          if (details.family === 'IPv4' && !details.internal) {
            localIPs.push(details.address);
          }
        });
      });

      // Try to get ARP table for device discovery (works on Unix-like systems)
      if (process.platform !== 'win32') {
        try {
          const { stdout } = await execPromise('arp -a');
          const lines = stdout.split('\n');

          lines.forEach(line => {
            // Parse ARP entries
            const match = line.match(/(\d+\.\d+\.\d+\.\d+).*?([0-9a-f:]+)/i);
            if (match) {
              const [, ip, mac] = match;
              if (!this.devices.has(ip)) {
                this.devices.set(ip, {
                  ip,
                  mac,
                  firstSeen: new Date(),
                  lastSeen: new Date(),
                  hostname: null,
                  deviceName: this.getDeviceName(ip),
                  manufacturer: this.getMacManufacturer(mac),
                  totalQueries: 0,
                  blockedQueries: 0,
                  allowedQueries: 0,
                  recentDomains: [],
                  status: 'discovered'
                });
              }
            }
          });
        } catch (error) {
          // ARP command might not be available
          console.log('Could not scan ARP table:', error.message);
        }
      }

      // Mark devices as inactive if not seen for 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      this.devices.forEach((device, ip) => {
        if (device.lastSeen < fiveMinutesAgo) {
          device.status = 'inactive';
        } else {
          device.status = 'active';
        }
      });
    } catch (error) {
      console.error('Error scanning network devices:', error);
    }
  }

  getMacManufacturer(mac) {
    // Simple MAC manufacturer lookup (you can expand this)
    const prefix = mac.substr(0, 8).toUpperCase();
    const manufacturers = {
      '00:1B:44': 'Samsung',
      '00:1E:C2': 'Apple',
      '00:23:12': 'Apple',
      'DC:A6:32': 'Raspberry Pi',
      'B8:27:EB': 'Raspberry Pi',
      '00:50:56': 'VMware',
      '00:0C:29': 'VMware',
      '08:00:27': 'VirtualBox'
    };

    return manufacturers[prefix] || 'Unknown';
  }

  setDeviceName(ip, name) {
    this.deviceNames.set(ip, name);
    if (this.devices.has(ip)) {
      this.devices.get(ip).deviceName = name;
    }
  }

  getDevice(ip) {
    return this.devices.get(ip);
  }

  getAllDevices() {
    return Array.from(this.devices.values());
  }

  getActiveDevices() {
    return this.getAllDevices().filter(d => d.status === 'active');
  }

  getDeviceStats(ip) {
    const device = this.devices.get(ip);
    if (!device) return null;

    return {
      ...device,
      blockRate: device.totalQueries > 0
        ? ((device.blockedQueries / device.totalQueries) * 100).toFixed(1)
        : 0
    };
  }

  // Get network information for configuration
  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const networks = [];

    Object.keys(interfaces).forEach(name => {
      interfaces[name].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          networks.push({
            interface: name,
            ip: iface.address,
            netmask: iface.netmask,
            mac: iface.mac,
            network: this.getNetworkAddress(iface.address, iface.netmask)
          });
        }
      });
    });

    return networks;
  }

  getNetworkAddress(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const netmaskParts = netmask.split('.').map(Number);
    const network = ipParts.map((part, i) => part & netmaskParts[i]);
    return network.join('.');
  }

  // Real-time event emitter for WebSocket
  getRealtimeUpdate(ip, domain, action) {
    const device = this.trackDevice(ip, domain, action);
    return {
      type: 'device_activity',
      device: {
        ip: device.ip,
        name: device.deviceName,
        status: device.status
      },
      activity: {
        domain,
        action,
        timestamp: new Date()
      },
      stats: {
        total: device.totalQueries,
        blocked: device.blockedQueries,
        allowed: device.allowedQueries
      }
    };
  }
}

module.exports = new DeviceTracker();