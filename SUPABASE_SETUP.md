# Supabase Database Setup for WiFi Firewall

## Overview
This WiFi Firewall now uses Supabase as its primary database for storing blocked websites, access logs, and configuration. This provides persistent storage, real-time updates, and better scalability.

## Database Connection Status
✅ **Supabase is connected and working!**

## Features Enabled with Supabase

### 1. Persistent Storage
- All blocked/allowed domains are stored in the cloud
- Settings and configurations persist across restarts
- Access logs are permanently stored for analysis

### 2. Real-time Updates
- Changes to blocked domains sync instantly across all connected clients
- Live access log streaming
- Immediate rule updates

### 3. Access Control & Logging
- Track which devices on your WiFi access which websites
- Log blocked and allowed requests with timestamps
- IP-based tracking for device identification

## Database Tables Created

### 1. `blocked_domains`
Stores all blocked and allowed domains
- `id` - Unique identifier
- `domain` - The domain name
- `type` - 'blocked' or 'allowed'
- `category` - Optional category
- `created_at` - When the rule was created
- `ip_address` - IP that added the rule

### 2. `access_logs`
Records all DNS queries
- `id` - Unique identifier
- `domain` - Requested domain
- `action` - 'blocked' or 'allowed'
- `ip_address` - Device IP making the request
- `timestamp` - When the request was made

### 3. `categories`
Manages domain categories
- `id` - Unique identifier
- `name` - Category name (social, streaming, gaming, etc.)
- `domains` - Array of domains in this category
- `enabled` - Whether category blocking is active

### 4. `settings`
Stores system configuration
- `id` - Unique identifier
- `key` - Setting name
- `value` - Setting value (JSON)

## API Endpoints

### Database Status
```bash
GET http://localhost:3001/api/database/status
```
Returns connection status and available features

### Access Logs
```bash
GET http://localhost:3001/api/logs?limit=100
```
Retrieves recent access logs from the database

### Statistics
```bash
GET http://localhost:3001/api/stats
```
Returns blocking statistics including database metrics

## How It Works

1. **DNS Queries**: When a device on your WiFi makes a DNS request, it's checked against the Supabase database
2. **Blocking Decision**: The domain is either blocked or allowed based on database rules
3. **Logging**: Every request is logged to Supabase with device IP and timestamp
4. **Real-time Sync**: Changes to rules update immediately across all instances

## Managing Your Database

### To Add a Blocked Domain
The domain will be automatically saved to Supabase when added through the web interface or API.

### To View Access Logs
Access logs are automatically stored and can be viewed through:
- Web dashboard at http://localhost:5173
- API endpoint: `GET /api/logs`
- Supabase dashboard directly

### Data Persistence
All data is stored in Supabase cloud storage, so it persists even if:
- The server restarts
- The application crashes
- You redeploy the application

## Security Notes

- Supabase credentials are stored in `.env` file
- The anon key is safe for client-side use
- Row Level Security (RLS) can be enabled for additional protection
- All data is encrypted in transit and at rest

## Fallback Mechanism

If Supabase is unavailable, the system automatically falls back to:
1. Local file storage (data/rules.json)
2. In-memory caching
3. Redis (if configured)

This ensures your firewall continues working even without database connectivity.

## Next Steps

1. **Enable Row Level Security**: Add RLS policies in Supabase dashboard for enhanced security
2. **Set up Backups**: Configure automatic backups in Supabase
3. **Add Authentication**: Implement user authentication for multi-user support
4. **Analytics Dashboard**: Build advanced analytics using the logged data

## Monitoring

The application logs show database status:
- ✅ "Supabase database connected" - Database is working
- ⚠️ "Using local storage" - Fallback mode active

Check connection status anytime:
```bash
curl http://localhost:3001/api/database/status
```

## Troubleshooting

If the database isn't connecting:
1. Check your `.env` file has correct Supabase credentials
2. Ensure your Supabase project is active
3. Verify network connectivity
4. Check the console logs for error messages

Your WiFi Firewall is now powered by Supabase for reliable, persistent, and scalable website blocking!