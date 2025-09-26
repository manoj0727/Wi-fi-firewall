#!/bin/bash

echo "========================================="
echo "WiFi Firewall - Privacy & Security Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will secure your WiFi Firewall installation${NC}"
echo ""

# 1. Secure the .env file
echo -e "${GREEN}[1/5] Securing environment file...${NC}"
if [ -f ".env" ]; then
    # Remove sensitive data from .env
    sed -i.backup 's/SUPABASE_URL=.*/SUPABASE_URL=/' .env 2>/dev/null || sed -i '' 's/SUPABASE_URL=.*/SUPABASE_URL=/' .env
    sed -i.backup 's/SUPABASE_ANON_KEY=.*/SUPABASE_ANON_KEY=/' .env 2>/dev/null || sed -i '' 's/SUPABASE_ANON_KEY=.*/SUPABASE_ANON_KEY=/' .env

    # Set private mode
    echo "" >> .env
    echo "# Privacy Settings (Auto-configured)" >> .env
    echo "PRIVACY_MODE=strict" >> .env
    echo "ANONYMIZE_IPS=true" >> .env
    echo "HASH_DOMAINS=true" >> .env
    echo "DATA_RETENTION_DAYS=1" >> .env
    echo "AUTO_CLEANUP=true" >> .env
    echo "NO_TELEMETRY=true" >> .env
    echo "LOCAL_ONLY=true" >> .env
    echo "MEMORY_ONLY=false" >> .env

    # Secure file permissions
    chmod 600 .env
    echo "✓ Environment file secured"
else
    echo "Creating secure .env file..."
    cat > .env << EOF
# Private Configuration
PRIVACY_MODE=strict
ANONYMIZE_IPS=true
HASH_DOMAINS=true
DATA_RETENTION_DAYS=1
AUTO_CLEANUP=true
NO_TELEMETRY=true
LOCAL_ONLY=true
PORT=3001
DNS_PORT=53
UPSTREAM_DNS=1.1.1.1
EOF
    chmod 600 .env
    echo "✓ Secure .env file created"
fi

# 2. Secure data directory
echo -e "${GREEN}[2/5] Securing data directory...${NC}"
if [ ! -d "data" ]; then
    mkdir -p data
fi
chmod 700 data
echo "✓ Data directory secured"

# 3. Create secure directories
echo -e "${GREEN}[3/5] Creating secure directories...${NC}"
mkdir -p data/logs 2>/dev/null
mkdir -p data/temp 2>/dev/null
chmod -R 700 data/
echo "✓ Secure directories created"

# 4. Generate encryption key if needed
echo -e "${GREEN}[4/5] Generating encryption key...${NC}"
if ! grep -q "ENCRYPTION_KEY=" .env || [ -z "$(grep ENCRYPTION_KEY= .env | cut -d= -f2)" ]; then
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
    echo "✓ Encryption key generated"
else
    echo "✓ Encryption key exists"
fi

# 5. Clear existing data for privacy
echo -e "${GREEN}[5/5] Privacy cleanup...${NC}"
read -p "Clear all existing logs and data for maximum privacy? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf data/logs/* 2>/dev/null
    rm -rf data/temp/* 2>/dev/null
    rm -f data/*.log 2>/dev/null
    rm -f data/*.json 2>/dev/null
    echo "✓ Previous data cleared"
else
    echo "✓ Keeping existing data"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Privacy Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Current Privacy Configuration:"
echo "  • Mode: STRICT (Maximum Privacy)"
echo "  • IP Anonymization: ENABLED"
echo "  • Domain Hashing: ENABLED"
echo "  • Data Retention: 1 DAY"
echo "  • External Connections: DISABLED"
echo "  • Local-Only Mode: ENABLED"
echo ""
echo "Your WiFi Firewall is now configured for maximum privacy:"
echo "  ✓ No external database connections"
echo "  ✓ All data stays local"
echo "  ✓ IPs are anonymized"
echo "  ✓ Minimal data retention"
echo "  ✓ Encrypted local storage"
echo ""
echo -e "${YELLOW}To start with privacy mode:${NC}"
echo "  npm start"
echo ""
echo -e "${YELLOW}To access privacy settings:${NC}"
echo "  http://localhost:5173/privacy"
echo ""