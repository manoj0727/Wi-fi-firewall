const os = require('os');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const database = require('./database');

class NetworkEnforcer {
  constructor() {
    this.platform = os.platform();
    this.networkConfig = null;
    this.isEnforcing = false;
    this.captivePortalActive = false;
  }

  async initialize() {
    console.log('Initializing Network Enforcer...');
    await this.detectNetworkSetup();
    await this.loadSavedConfig();
  }

  async detectNetworkSetup() {
    const interfaces = os.networkInterfaces();
    const activeInterfaces = [];

    Object.keys(interfaces).forEach(name => {
      interfaces[name].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          activeInterfaces.push({
            name,
            ip: iface.address,
            netmask: iface.netmask,
            mac: iface.mac,
            network: this.calculateNetwork(iface.address, iface.netmask)
          });
        }
      });
    });

    this.networkConfig = {
      interfaces: activeInterfaces,
      platform: this.platform,
      hostname: os.hostname(),
      dnsServerIP: activeInterfaces[0]?.ip || '127.0.0.1',
      dnsPort: 53
    };

    return this.networkConfig;
  }

  calculateNetwork(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const network = ipParts.map((part, i) => part & maskParts[i]);
    return network.join('.');
  }

  async registerNetwork(networkName, password) {
    // Save network configuration to database
    if (database.isInitialized()) {
      try {
        // Save settings to database
        const settings = [
          { key: 'network_name', value: networkName },
          { key: 'network_registered', value: 'true' },
          { key: 'dns_server', value: this.networkConfig.dnsServerIP }
        ];

        for (const setting of settings) {
          await database.client
            .from('settings')
            .upsert(setting, { onConflict: 'key' });
        }
      } catch (error) {
        console.error('Failed to save network settings:', error);
      }
    }

    return {
      success: true,
      networkName,
      dnsServer: this.networkConfig.dnsServerIP,
      instructions: this.getSetupInstructions()
    };
  }

  getSetupInstructions() {
    const dnsIP = this.networkConfig.dnsServerIP;

    return {
      automatic: {
        router: {
          title: 'Router Configuration (Recommended)',
          steps: [
            `1. Access your router's admin panel (usually 192.168.1.1 or 192.168.0.1)`,
            `2. Navigate to DHCP Settings or Network Settings`,
            `3. Change Primary DNS Server to: ${dnsIP}`,
            `4. Change Secondary DNS Server to: ${dnsIP}`,
            `5. Save settings and restart router`,
            `6. All devices will automatically use this DNS`
          ]
        },
        hotspot: {
          title: 'Mobile Hotspot Configuration',
          macOS: [
            `1. System Preferences → Sharing`,
            `2. Select "Internet Sharing"`,
            `3. Click "Wi-Fi Options"`,
            `4. Configure network name and password`,
            `5. Start sharing`,
            `6. Run this command in terminal:`,
            `   sudo networksetup -setdnsservers Wi-Fi ${dnsIP}`
          ],
          windows: [
            `1. Settings → Network & Internet → Mobile hotspot`,
            `2. Turn on "Share my Internet connection"`,
            `3. Open Command Prompt as Administrator`,
            `4. Run: netsh interface ip set dns "Wi-Fi" static ${dnsIP}`
          ],
          linux: [
            `1. Create hotspot using Network Manager`,
            `2. Edit connection settings`,
            `3. Set DNS to ${dnsIP}`,
            `4. Or run: nmcli con mod <connection-name> ipv4.dns ${dnsIP}`
          ]
        }
      },
      manual: {
        title: 'Manual Device Configuration',
        ios: [
          `1. Settings → Wi-Fi → Select Network → Configure DNS`,
          `2. Change to "Manual"`,
          `3. Add Server: ${dnsIP}`,
          `4. Save`
        ],
        android: [
          `1. Settings → Wi-Fi → Long press network → Modify network`,
          `2. Advanced options → IP settings: Static`,
          `3. DNS 1: ${dnsIP}`,
          `4. Save`
        ],
        windows: [
          `1. Network Settings → Change adapter options`,
          `2. Right-click network → Properties`,
          `3. Internet Protocol Version 4 → Properties`,
          `4. Use the following DNS: ${dnsIP}`
        ],
        macOS: [
          `1. System Preferences → Network → Advanced`,
          `2. DNS tab → Add ${dnsIP}`,
          `3. Apply`
        ]
      }
    };
  }

  async enableAutomaticEnforcement() {
    if (this.platform === 'darwin') {
      return await this.enableMacOSEnforcement();
    } else if (this.platform === 'linux') {
      return await this.enableLinuxEnforcement();
    } else if (this.platform === 'win32') {
      return await this.enableWindowsEnforcement();
    }
  }

  async enableMacOSEnforcement() {
    try {
      // Enable IP forwarding
      await execPromise('sudo sysctl -w net.inet.ip.forwarding=1');

      // Create packet filter rules
      const pfRules = `
# WiFi Firewall DNS Enforcement
# Redirect all DNS traffic to our server
rdr pass on en0 inet proto udp from any to any port 53 -> ${this.networkConfig.dnsServerIP} port 53
rdr pass on en0 inet proto tcp from any to any port 53 -> ${this.networkConfig.dnsServerIP} port 53

# Block direct IP access to blocked domains (optional)
# This would require maintaining an IP blocklist
`;

      // Write pf rules to file
      const fs = require('fs').promises;
      await fs.writeFile('/tmp/wifi-firewall.pf', pfRules);

      // Load pf rules
      await execPromise('sudo pfctl -f /tmp/wifi-firewall.pf');
      await execPromise('sudo pfctl -e'); // Enable packet filter

      this.isEnforcing = true;
      return { success: true, message: 'DNS enforcement enabled on macOS' };
    } catch (error) {
      console.error('Failed to enable macOS enforcement:', error);
      return { success: false, error: error.message };
    }
  }

  async enableLinuxEnforcement() {
    try {
      const dnsIP = this.networkConfig.dnsServerIP;

      // Enable IP forwarding
      await execPromise('sudo sysctl -w net.ipv4.ip_forward=1');

      // Use iptables to redirect DNS traffic
      const commands = [
        // Redirect all DNS queries to our server
        `sudo iptables -t nat -A PREROUTING -p udp --dport 53 -j DNAT --to-destination ${dnsIP}:53`,
        `sudo iptables -t nat -A PREROUTING -p tcp --dport 53 -j DNAT --to-destination ${dnsIP}:53`,

        // Prevent bypassing by blocking external DNS
        `sudo iptables -A FORWARD -p udp --dport 53 ! -d ${dnsIP} -j DROP`,
        `sudo iptables -A FORWARD -p tcp --dport 53 ! -d ${dnsIP} -j DROP`,

        // Allow our DNS server
        `sudo iptables -A INPUT -p udp --dport 53 -d ${dnsIP} -j ACCEPT`,
        `sudo iptables -A INPUT -p tcp --dport 53 -d ${dnsIP} -j ACCEPT`
      ];

      for (const cmd of commands) {
        await execPromise(cmd);
      }

      // Save iptables rules
      await execPromise('sudo iptables-save > /tmp/wifi-firewall-iptables.rules');

      this.isEnforcing = true;
      return { success: true, message: 'DNS enforcement enabled on Linux' };
    } catch (error) {
      console.error('Failed to enable Linux enforcement:', error);
      return { success: false, error: error.message };
    }
  }

  async enableWindowsEnforcement() {
    try {
      const dnsIP = this.networkConfig.dnsServerIP;

      // Use netsh to configure Windows Firewall and DNS
      const commands = [
        // Block external DNS servers
        `netsh advfirewall firewall add rule name="Block External DNS UDP" dir=out action=block protocol=UDP remoteport=53 remoteip=!${dnsIP}`,
        `netsh advfirewall firewall add rule name="Block External DNS TCP" dir=out action=block protocol=TCP remoteport=53 remoteip=!${dnsIP}`,

        // Allow our DNS server
        `netsh advfirewall firewall add rule name="Allow WiFi Firewall DNS" dir=out action=allow protocol=UDP remoteport=53 remoteip=${dnsIP}`,

        // Set DNS for all network adapters
        `netsh interface ip set dns "Wi-Fi" static ${dnsIP}`,
        `netsh interface ip set dns "Ethernet" static ${dnsIP}`
      ];

      for (const cmd of commands) {
        await execPromise(cmd);
      }

      this.isEnforcing = true;
      return { success: true, message: 'DNS enforcement enabled on Windows' };
    } catch (error) {
      console.error('Failed to enable Windows enforcement:', error);
      return { success: false, error: error.message };
    }
  }

  async disableEnforcement() {
    if (this.platform === 'darwin') {
      await execPromise('sudo pfctl -d').catch(() => {});
    } else if (this.platform === 'linux') {
      // Clear iptables rules
      await execPromise('sudo iptables -t nat -F').catch(() => {});
      await execPromise('sudo iptables -F FORWARD').catch(() => {});
    } else if (this.platform === 'win32') {
      // Remove Windows firewall rules
      await execPromise('netsh advfirewall firewall delete rule name="Block External DNS UDP"').catch(() => {});
      await execPromise('netsh advfirewall firewall delete rule name="Block External DNS TCP"').catch(() => {});
      await execPromise('netsh advfirewall firewall delete rule name="Allow WiFi Firewall DNS"').catch(() => {});
    }

    this.isEnforcing = false;
    return { success: true, message: 'DNS enforcement disabled' };
  }

  async createCaptivePortal() {
    // This creates a captive portal that forces new devices to register
    const express = require('express');
    const captiveApp = express();

    captiveApp.use(express.json());
    captiveApp.use(express.static('captive-portal'));

    // Intercept all HTTP requests
    captiveApp.get('*', (req, res) => {
      // Check if device is registered
      const deviceIP = req.ip;
      const isRegistered = this.isDeviceRegistered(deviceIP);

      if (!isRegistered) {
        // Redirect to captive portal
        res.redirect('/register.html');
      } else {
        // Allow normal browsing
        res.redirect(req.originalUrl);
      }
    });

    captiveApp.post('/register', async (req, res) => {
      const { deviceName, acceptTerms } = req.body;
      const deviceIP = req.ip;

      if (acceptTerms) {
        await this.registerDevice(deviceIP, deviceName);
        res.json({ success: true, message: 'Device registered successfully' });
      } else {
        res.status(400).json({ error: 'Must accept terms to use network' });
      }
    });

    const CAPTIVE_PORT = 8080;
    captiveApp.listen(CAPTIVE_PORT, () => {
      console.log(`Captive portal running on port ${CAPTIVE_PORT}`);
      this.captivePortalActive = true;
    });

    return captiveApp;
  }

  isDeviceRegistered(ip) {
    // Check if device has been registered
    // This would check against database or local storage
    return false; // For now, return false to show captive portal
  }

  async registerDevice(ip, deviceName) {
    // Register device in database
    if (database.isInitialized()) {
      await database.run(
        'INSERT INTO registered_devices (ip_address, device_name, registered_at) VALUES (?, ?, ?)',
        [ip, deviceName, new Date().toISOString()]
      );
    }
  }

  async loadSavedConfig() {
    if (database.isInitialized()) {
      try {
        // Check if network has been registered
        const result = await database.client
          .from('settings')
          .select('*')
          .in('key', ['network_registered', 'network_name']);

        if (result.data && result.data.length > 0) {
          const settings = {};
          result.data.forEach(row => {
            settings[row.key] = row.value;
          });

          if (settings.network_registered === 'true') {
            console.log('Network already registered:', settings.network_name);
          }
        }
      } catch (error) {
        console.log('No saved network configuration found');
      }
    }
  }

  getStatus() {
    return {
      enforcing: this.isEnforcing,
      captivePortal: this.captivePortalActive,
      platform: this.platform,
      network: this.networkConfig
    };
  }
}

module.exports = NetworkEnforcer;