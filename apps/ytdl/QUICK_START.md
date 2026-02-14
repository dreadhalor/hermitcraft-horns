# Multi-VPN Local Testing - Quick Start

## 🚀 Run Tests in 3 Commands

```bash
# 1. Start the stack (3 VPNs + ytdl + redis)
./test-local.sh

# 2. Verify VPNs are connected (check different IPs)
./check-vpn-ips.sh

# 3. Test a download with multi-VPN retry
./test-download.sh
```

## 📋 Key Commands

```bash
# View live logs
docker-compose -f docker-compose.local.yml logs -f ytdl

# Check VPN status
docker ps | grep gluetun

# Query VPN stats endpoint
curl http://localhost:3001/trpc/vpnStatus -H "x-api-key: $YTDL_INTERNAL_API_KEY"

# Stop everything
docker-compose -f docker-compose.local.yml down
```

## ✅ What to Verify

- [ ] All 3 gluetun containers show different public IPs
- [ ] ytdl server starts with "VPN Download Manager initialized with 3 VPN proxies"
- [ ] Test download succeeds (even if first VPN fails)
- [ ] Console logs show detailed "VPN Journey" with attempts
- [ ] Database logs include VPN tracking data (vpnAttempts, vpnProxiesTried, etc.)

## 🧪 Test Scenarios

```bash
# Scenario 1: Normal operation (all VPNs work)
./test-download.sh

# Scenario 2: Failover (stop first VPN, watch it retry with others)
docker stop gluetun-local-1
./test-download.sh
docker start gluetun-local-1

# Scenario 3: Test blocked video (see all VPNs get tried)
# Edit test-download.sh VIDEO_URL to https://www.youtube.com/watch?v=jNQXAC9IVRw
./test-download.sh
```

See `LOCAL_TESTING.md` for comprehensive testing guide.
