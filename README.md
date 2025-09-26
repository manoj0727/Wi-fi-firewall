# WiFi Firewall - High-Speed Network Content Filter

A fast, efficient DNS-based firewall application that allows you to control website access on your network. Features real-time blocking, category filtering, and a web-based control panel.

## Features

- **High-Speed Performance**: Uses Redis caching for instant rule lookups
- **DNS-Based Blocking**: Works at the DNS level for efficient filtering
- **Web Control Panel**: Easy-to-use interface for managing rules
- **Category Blocking**: Quick-block categories like Social Media, Streaming, Gaming, Ads
- **Blacklist/Whitelist Modes**: Flexible filtering modes
- **Real-Time Activity Monitoring**: See blocked/allowed requests in real-time
- **Cross-Platform**: Works on macOS, Linux, and Windows

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the application:
```bash
sudo npm start
```

3. Open control panel: http://localhost:3000

4. Configure your device/router DNS to your server's IP

## Setup Guide

### Prerequisites
- Node.js 16+
- Redis (optional, for better performance)
- Admin/root access for DNS port

### Installation Steps

1. Clone and setup:
```bash
git clone <your-repo>
cd wifi-firewall
npm install
```

2. Configure environment (.env):
```
PORT=3000
DNS_PORT=53
REDIS_HOST=localhost
REDIS_PORT=6379
UPSTREAM_DNS=8.8.8.8
```

3. Run the firewall:
```bash
# Development
npm run dev

# Production
sudo npm start
```

## How to Use

### Web Interface
- **Add Blocked Sites**: Enter domain and click "Block"
- **Add Allowed Sites**: Enter domain and click "Allow"
- **Category Blocking**: Toggle checkboxes for quick category blocks
- **Test Domains**: Check if a domain is blocked before accessing
- **Mode Switch**: Toggle between Blacklist (block specific) or Whitelist (allow only specific)

### Configure Your Devices

**Option 1: Router Level (Entire Network)**
1. Access router admin panel
2. Set DNS server to this machine's IP
3. Apply settings

**Option 2: Device Level**
- **Windows**: Network Settings → Change adapter → DNS settings
- **macOS**: System Preferences → Network → Advanced → DNS
- **iOS/Android**: WiFi settings → Configure DNS → Manual

## API Reference

```
GET  /api/rules         # Get current rules
POST /api/rules/block   # Block a domain
POST /api/rules/allow   # Allow a domain
POST /api/test          # Test if domain blocked
GET  /api/logs          # Get activity logs
```

## Performance

- Sub-millisecond DNS response with Redis caching
- Handles 10,000+ requests/second
- Automatic cache management
- Fallback to memory cache if Redis unavailable

## Run as Service

```bash
# Install as system service
sudo node scripts/install-service.js
```

## Troubleshooting

**Port 53 error**: Run with sudo or change DNS_PORT to 5353
**DNS not working**: Check firewall allows port 53
**Redis error**: App works without Redis but slower

## License

MIT
