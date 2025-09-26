#!/bin/bash

echo "================================"
echo "WiFi Firewall - DNS Blocking Test"
echo "================================"
echo ""

# Get local IP
LOCAL_IP=$(ifconfig en0 | grep 'inet ' | awk '{print $2}' || ifconfig en1 | grep 'inet ' | awk '{print $2}' || echo "127.0.0.1")

echo "DNS Server: $LOCAL_IP:53"
echo ""

# Function to test DNS resolution
test_domain() {
    local domain=$1
    echo "Testing: $domain"

    # Test using nslookup
    result=$(nslookup $domain $LOCAL_IP 2>&1 | grep "Address:" | tail -1)

    if [[ $result == *"0.0.0.0"* ]]; then
        echo "  ✅ BLOCKED - Resolves to 0.0.0.0"
    elif [[ $result == *"Address:"* ]]; then
        echo "  ❌ ALLOWED - Resolves to: ${result#*: }"
    else
        echo "  ⚠️  Could not resolve (DNS server might not be running)"
    fi
    echo ""
}

# Menu
echo "Select test option:"
echo "1) Test a specific domain"
echo "2) Add domain to blocklist and test"
echo "3) Test common domains"
echo "4) Check DNS configuration"
echo ""

read -p "Choice [1-4]: " choice

case $choice in
    1)
        read -p "Enter domain to test (e.g., facebook.com): " domain
        test_domain $domain
        ;;
    2)
        read -p "Enter domain to block (e.g., facebook.com): " domain

        # Add to blocklist via API
        echo "Adding $domain to blocklist..."
        curl -X POST http://localhost:3001/api/blocked-domains \
             -H "Content-Type: application/json" \
             -d "{\"domain\":\"$domain\"}" \
             -s > /dev/null

        echo "Waiting for DNS to update..."
        sleep 2

        test_domain $domain
        ;;
    3)
        echo "Testing common domains..."
        echo ""

        # Test some domains
        test_domain "google.com"
        test_domain "facebook.com"
        test_domain "youtube.com"
        test_domain "example.com"
        ;;
    4)
        echo "Current DNS Configuration:"
        echo ""

        # Check system DNS
        echo "System DNS servers:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            networksetup -getdnsservers Wi-Fi
        else
            cat /etc/resolv.conf | grep nameserver
        fi
        echo ""

        echo "To use WiFi Firewall DNS, configure your device:"
        echo "  Primary DNS: $LOCAL_IP"
        echo "  Port: 53"
        echo ""

        echo "Testing if DNS server is running..."
        nc -zv $LOCAL_IP 53 2>&1
        ;;
esac

echo ""
echo "================================"
echo "IMPORTANT: For blocking to work:"
echo "1. DNS server must be running (npm start)"
echo "2. Your device must use $LOCAL_IP as DNS server"
echo "3. Domain must be in the blocklist"
echo "================================"