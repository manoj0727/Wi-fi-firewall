const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const platform = os.platform();

if (platform === 'darwin') {
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.wifi.firewall</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${path.join(__dirname, '../src/server.js')}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${path.join(__dirname, '..')}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/usr/local/var/log/wifi-firewall.log</string>
    <key>StandardErrorPath</key>
    <string>/usr/local/var/log/wifi-firewall.error.log</string>
</dict>
</plist>`;

    const plistPath = '/Library/LaunchDaemons/com.wifi.firewall.plist';

    try {
        fs.writeFileSync(plistPath, plistContent);
        execSync(`launchctl load ${plistPath}`);
        console.log('Service installed successfully on macOS');
        console.log('The firewall will start automatically on boot');
    } catch (error) {
        console.error('Failed to install service:', error.message);
        console.log('\nTry running: sudo node scripts/install-service.js');
    }

} else if (platform === 'linux') {
    const systemdContent = `[Unit]
Description=WiFi Firewall Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${path.join(__dirname, '..')}
ExecStart=/usr/bin/node ${path.join(__dirname, '../src/server.js')}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`;

    const servicePath = '/etc/systemd/system/wifi-firewall.service';

    try {
        fs.writeFileSync(servicePath, systemdContent);
        execSync('systemctl daemon-reload');
        execSync('systemctl enable wifi-firewall.service');
        execSync('systemctl start wifi-firewall.service');
        console.log('Service installed successfully on Linux');
        console.log('The firewall will start automatically on boot');
    } catch (error) {
        console.error('Failed to install service:', error.message);
        console.log('\nTry running: sudo node scripts/install-service.js');
    }

} else if (platform === 'win32') {
    console.log('Windows service installation:');
    console.log('1. Install node-windows: npm install -g node-windows');
    console.log('2. Run the Windows installer script');

    const winServiceContent = `const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
    name: 'WiFi Firewall',
    description: 'WiFi Firewall Service',
    script: path.join(__dirname, '../src/server.js'),
    nodeOptions: ['--harmony', '--max_old_space_size=4096'],
    env: {
        name: 'NODE_ENV',
        value: 'production'
    }
});

svc.on('install', () => {
    svc.start();
    console.log('Service installed and started');
});

svc.install();`;

    fs.writeFileSync(path.join(__dirname, 'install-windows.js'), winServiceContent);
    console.log('\nWindows service script created: scripts/install-windows.js');
    console.log('Run: node scripts/install-windows.js');
}

console.log('\nIMPORTANT: DNS port 53 requires root/admin privileges');
console.log('Make sure to run the service with appropriate permissions');