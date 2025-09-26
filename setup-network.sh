#!/bin/bash

# WiFi Firewall Network Setup Script
# This script helps configure your network to automatically enforce DNS filtering

echo "========================================="
echo "WiFi Firewall - Network Setup Helper"
echo "========================================="
echo ""

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     PLATFORM=Linux;;
    Darwin*)    PLATFORM=Mac;;
    MINGW*|CYGWIN*|MSYS*) PLATFORM=Windows;;
    *)          PLATFORM="UNKNOWN";;
esac

echo "Detected Platform: $PLATFORM"
echo ""

# Get local IP address
if [ "$PLATFORM" = "Mac" ]; then
    LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
elif [ "$PLATFORM" = "Linux" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    LOCAL_IP="127.0.0.1"
fi

echo "DNS Server IP: $LOCAL_IP"
echo "DNS Port: 53"
echo ""

# Function to setup router DNS
setup_router() {
    echo "=== Router Configuration (Recommended) ==="
    echo "This will apply DNS filtering to ALL devices on your network automatically."
    echo ""
    echo "1. Access your router's admin panel:"
    echo "   - Usually at http://192.168.1.1 or http://192.168.0.1"
    echo "   - Login with your router admin credentials"
    echo ""
    echo "2. Find DHCP or DNS Settings:"
    echo "   - Look for: Network Settings, DHCP Settings, or DNS Configuration"
    echo ""
    echo "3. Change DNS servers to:"
    echo "   Primary DNS: $LOCAL_IP"
    echo "   Secondary DNS: $LOCAL_IP"
    echo ""
    echo "4. Save settings and restart router"
    echo ""
    echo "5. All devices will automatically use the WiFi Firewall DNS!"
    echo ""
}

# Function to setup macOS hotspot
setup_mac_hotspot() {
    echo "=== macOS Hotspot Configuration ==="
    echo ""
    echo "1. Enable Internet Sharing:"
    echo "   System Preferences → Sharing → Internet Sharing"
    echo ""
    echo "2. Configure WiFi:"
    echo "   - Click 'Wi-Fi Options'"
    echo "   - Set network name and password"
    echo "   - Start sharing"
    echo ""
    echo "3. Force DNS for all connections:"
    read -p "Do you want to apply DNS enforcement now? (requires sudo) [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Configuring DNS enforcement..."

        # Enable IP forwarding
        sudo sysctl -w net.inet.ip.forwarding=1

        # Create packet filter rules
        cat > /tmp/wifi-firewall.pf << EOF
# WiFi Firewall DNS Enforcement
# Redirect all DNS traffic to our server
rdr pass on en0 inet proto udp from any to any port 53 -> $LOCAL_IP port 53
rdr pass on en1 inet proto udp from any to any port 53 -> $LOCAL_IP port 53
EOF

        # Load and enable packet filter
        sudo pfctl -f /tmp/wifi-firewall.pf
        sudo pfctl -e

        echo "✓ DNS enforcement enabled!"
        echo "  All DNS queries will now go through WiFi Firewall"
    fi
    echo ""
}

# Function to setup Linux hotspot
setup_linux_hotspot() {
    echo "=== Linux Hotspot Configuration ==="
    echo ""
    echo "1. Create hotspot using NetworkManager:"
    echo "   nmcli dev wifi hotspot ifname wlan0 ssid 'YourNetwork' password 'YourPassword'"
    echo ""
    echo "2. Configure DNS:"
    read -p "Do you want to apply DNS enforcement now? (requires sudo) [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Configuring DNS enforcement..."

        # Enable IP forwarding
        sudo sysctl -w net.ipv4.ip_forward=1

        # Setup iptables rules
        sudo iptables -t nat -A PREROUTING -p udp --dport 53 -j DNAT --to-destination $LOCAL_IP:53
        sudo iptables -t nat -A PREROUTING -p tcp --dport 53 -j DNAT --to-destination $LOCAL_IP:53

        # Block external DNS
        sudo iptables -A FORWARD -p udp --dport 53 ! -d $LOCAL_IP -j DROP
        sudo iptables -A FORWARD -p tcp --dport 53 ! -d $LOCAL_IP -j DROP

        # Save rules
        sudo iptables-save > /tmp/wifi-firewall-iptables.rules

        echo "✓ DNS enforcement enabled!"
        echo "  All DNS queries will now go through WiFi Firewall"
    fi
    echo ""
}

# Function to test DNS
test_dns() {
    echo "=== Testing DNS Configuration ==="
    echo ""
    echo "Testing DNS resolution through WiFi Firewall..."

    # Test using nslookup
    if command -v nslookup &> /dev/null; then
        echo "Testing google.com..."
        nslookup google.com $LOCAL_IP
    elif command -v dig &> /dev/null; then
        echo "Testing google.com..."
        dig @$LOCAL_IP google.com
    else
        echo "No DNS testing tools found (nslookup or dig)"
    fi
    echo ""
}

# Main menu
echo "Select setup option:"
echo "1) Configure Router (Recommended - affects all devices)"
echo "2) Setup as Hotspot (Share from this computer)"
echo "3) Manual Device Configuration"
echo "4) Test DNS Configuration"
echo "5) Exit"
echo ""

read -p "Enter your choice [1-5]: " choice

case $choice in
    1)
        setup_router
        ;;
    2)
        if [ "$PLATFORM" = "Mac" ]; then
            setup_mac_hotspot
        elif [ "$PLATFORM" = "Linux" ]; then
            setup_linux_hotspot
        else
            echo "Hotspot setup not available for $PLATFORM"
        fi
        ;;
    3)
        echo ""
        echo "=== Manual Device Configuration ==="
        echo ""
        echo "Configure each device individually with these DNS settings:"
        echo ""
        echo "iOS/iPhone:"
        echo "  Settings → Wi-Fi → (i) → Configure DNS → Manual"
        echo "  Add Server: $LOCAL_IP"
        echo ""
        echo "Android:"
        echo "  Settings → Network & Internet → Wi-Fi → Long press network"
        echo "  Modify network → Advanced → Static IP"
        echo "  DNS 1: $LOCAL_IP"
        echo ""
        echo "Windows:"
        echo "  Settings → Network & Internet → Change adapter options"
        echo "  Right-click network → Properties → IPv4 → Properties"
        echo "  Use the following DNS: $LOCAL_IP"
        echo ""
        echo "macOS:"
        echo "  System Preferences → Network → Advanced → DNS"
        echo "  Add: $LOCAL_IP"
        echo ""
        ;;
    4)
        test_dns
        ;;
    5)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        ;;
esac

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Make sure the WiFi Firewall server is running (npm start)"
echo "2. Access the web interface at http://localhost:5173"
echo "3. Go to 'Network Setup' to register your network"
echo "4. Add blocked websites in 'Firewall Rules'"
echo ""
echo "DNS Server: $LOCAL_IP:53"
echo ""