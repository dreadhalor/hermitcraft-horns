# Fix EC2 + VPN Setup with Gluetun

## The Problem You Faced

Your current setup runs OpenVPN inside the ytdl Docker container with policy-based routing. This causes incoming traffic to port 3001 to be blocked because the VPN tunnel captures all traffic, and NordVPN's whitelist feature is unreliable on Linux.

## The Solution: Gluetun

**Gluetun** is a lightweight Docker container that acts as a VPN client and network gateway. Other containers can route their traffic through Gluetun while remaining accessible from outside.

### Architecture

```
Internet/Main App  -->  Gluetun Container (VPN Gateway)  -->  YTDL Container
                            |
                            v
                        NordVPN  -->  YouTube
```

**How it works**:
1. Gluetun container connects to NordVPN
2. Gluetun exposes port 3001 (accessible from outside)
3. ytdl container uses `network_mode: "service:gluetun"` - shares Gluetun's network
4. All ytdl outbound traffic routes through VPN
5. Incoming traffic to port 3001 reaches ytdl through Gluetun

## Implementation Steps

### 1. Update `docker-compose.yml`

Replace the current docker-compose.yml with this new structure:

```yaml
services:
  gluetun:
    image: qmcgaw/gluetun:latest
    container_name: gluetun
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    ports:
      - "3001:3001"  # Expose ytdl service port
    environment:
      - VPN_SERVICE_PROVIDER=nordvpn
      - OPENVPN_USER=${NORDVPN_USERNAME}
      - OPENVPN_PASSWORD=${NORDVPN_PASSWORD}
      - SERVER_COUNTRIES=United States
      - FIREWALL_OUTBOUND_SUBNETS=172.16.0.0/12  # Allow Docker network
    volumes:
      - ./gluetun:/gluetun
    restart: unless-stopped
    networks:
      - my-network

  ytdl:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ytdl
    network_mode: "service:gluetun"  # Route all traffic through gluetun
    depends_on:
      - gluetun
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    restart: unless-stopped

  redis:
    image: redis:alpine
    container_name: redis
    ports:
      - "6379:6379"
    networks:
      - my-network
    restart: unless-stopped

networks:
  my-network:
    external: true
```

### 2. Simplify Dockerfile

Remove OpenVPN installation and VPN configuration - Gluetun handles it.

Replace the current Dockerfile with:

```dockerfile
ARG NODE_VERSION=21.6.1
FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine as base
ARG PNPM_VERSION=8.15.1

WORKDIR /usr/src/app/apps/ytdl

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Install only required dependencies (no OpenVPN)
RUN apk update && \
    apk add --no-cache \
    ffmpeg \
    python3 \
    curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Copy application files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

# Expose the application port
EXPOSE 3001

# Start the Node.js application directly
CMD ["pnpm", "start"]
```

### 3. Remove `start.sh`

Delete the `start.sh` file - it's no longer needed since Gluetun handles VPN connection.

### 4. Create `.env` file

Create a `.env` file for environment variables (DO NOT commit this):

```bash
NORDVPN_USERNAME=fQCx2qyJjdrnVc21PWHDm9AE
NORDVPN_PASSWORD=b8TgbXBkiJhPbxqhm4o552xt
```

### 5. Update `.gitignore`

Add to `.gitignore`:

```
.env
gluetun/
```

### 6. Update Redis Connection

Since ytdl uses Gluetun's network, it needs to connect to Redis via the Docker network. Update your Redis connection in `server.ts` to use the Redis container hostname:

```typescript
// Connect to Redis via container name
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});
```

## EC2 Deployment Steps

### A. Remove existing NordVPN installation (if on host)

```bash
# SSH into EC2
ssh ec2-user@your-ec2-ip

# Stop and remove NordVPN from host (if installed)
nordvpn disconnect
nordvpn logout
sudo systemctl stop nordvpnd
sudo systemctl disable nordvpnd
```

### B. Set up Docker network

```bash
# Create external network (if not exists)
docker network create my-network
```

### C. Deploy updated containers

```bash
# Navigate to ytdl directory
cd /path/to/hermitcraft-horns/apps/ytdl

# Pull latest code
git pull

# Set environment variables (or use .env file)
export NORDVPN_USERNAME=fQCx2qyJjdrnVc21PWHDm9AE
export NORDVPN_PASSWORD=b8TgbXBkiJhPbxqhm4o552xt

# Stop old containers
docker-compose down

# Remove old images
docker rmi hermitcraft-horns:latest

# Build and start new containers
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker logs -f gluetun
docker logs -f ytdl
docker logs -f redis
```

### D. Verify VPN connection

```bash
# Check Gluetun is connected to VPN
docker exec gluetun wget -qO- ifconfig.me
# Should show NordVPN IP, not your EC2 IP

# Check ytdl routes through VPN
docker exec ytdl wget -qO- ifconfig.me
# Should show same NordVPN IP

# Test service is accessible from outside
curl http://your-ec2-ip:3001/health
# Should return 200 OK or your health check response
```

### E. Test YouTube download

Test from your main app by creating a horn. Monitor logs:

```bash
docker logs -f ytdl
```

## Testing Checklist

- [ ] Gluetun container is running and connected to VPN
- [ ] ytdl container is running
- [ ] Redis container is running and accessible
- [ ] Port 3001 is accessible from outside: `curl http://ec2-ip:3001/health`
- [ ] ytdl traffic routes through VPN: `docker exec ytdl curl ifconfig.me` shows VPN IP
- [ ] YouTube downloads work: Test creating a horn from main app
- [ ] No IP blocks from YouTube

## Troubleshooting

### Gluetun won't connect

```bash
# Check logs
docker logs gluetun

# Common issues:
# - Invalid NordVPN credentials
# - NordVPN server unavailable
# - NET_ADMIN capability missing

# Try different server country
docker-compose down
# Edit docker-compose.yml: SERVER_COUNTRIES=Canada
docker-compose up -d
```

### Port 3001 not accessible

```bash
# Check port is exposed
docker ps
# Should show 0.0.0.0:3001->3001/tcp for gluetun

# Check EC2 security group
# Ensure inbound rule allows TCP 3001 from 0.0.0.0/0

# Check if gluetun is blocking
docker exec gluetun iptables -L
```

### ytdl can't reach Redis

```bash
# Check Redis is running
docker ps | grep redis

# Check Redis is on correct network
docker inspect redis | grep NetworkMode

# Test connection from ytdl
docker exec ytdl nc -zv redis 6379
# Should show: redis (172.x.x.x:6379) open

# If fails, check Redis logs
docker logs redis
```

### YouTube still blocking

```bash
# Try different VPN server country
# Edit docker-compose.yml:
SERVER_COUNTRIES=Netherlands  # or Canada, UK, Germany

# Or specific city:
SERVER_CITIES=New York,Los Angeles

# Restart
docker-compose restart gluetun

# Check IP changed
docker exec gluetun curl ifconfig.me
```

### Container keeps restarting

```bash
# Check what's failing
docker-compose ps

# View logs
docker logs ytdl
docker logs gluetun

# Common issues:
# - Missing environment variables
# - VPN connection failed
# - Redis not accessible
# - Port already in use
```

## Alternative Solutions

### Option 2: Cloudflare Tunnel (Zero VPN Networking)

If Gluetun doesn't work and you have a domain, Cloudflare Tunnel is bulletproof:

1. **Install cloudflared on EC2**:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

2. **Authenticate**:
```bash
cloudflared tunnel login
```

3. **Create tunnel**:
```bash
cloudflared tunnel create ytdl-tunnel
```

4. **Configure** (`~/.cloudflared/config.yml`):
```yaml
tunnel: <tunnel-id-from-previous-command>
credentials-file: /home/ec2-user/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: ytdl.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

5. **Route DNS**:
```bash
cloudflared tunnel route dns ytdl-tunnel ytdl.yourdomain.com
```

6. **Run as service**:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

7. **Update main app URL**:
```bash
NEXT_PUBLIC_YTDL_URL=https://ytdl.yourdomain.com/
```

**Pros**: 
- Free for moderate usage
- Zero networking complexity
- Works with NordVPN on host
- Automatic SSL/TLS
- DDoS protection

**Cons**: 
- Requires domain
- Traffic goes through Cloudflare

### Option 3: Private Internet Access (PIA)

PIA supports true port forwarding. If NordVPN continues to have issues, consider switching:

```yaml
gluetun:
  environment:
    - VPN_SERVICE_PROVIDER=private internet access
    - OPENVPN_USER=<pia-username>
    - OPENVPN_PASSWORD=<pia-password>
    - SERVER_REGIONS=US New York
    - PORT_FORWARD_ONLY=on
```

**Cost**: ~$40/year for PIA subscription

## Cost Analysis

| Component | Cost |
|-----------|------|
| EC2 t3.small | ~$15/month |
| NordVPN (existing) | $0 (already have) |
| Gluetun | $0 (open source) |
| Redis on Docker | $0 (local) |
| **Total** | **~$15/month** |

Compare to proxy solution: $100-500/month

## Important Notes

1. **Security**: Never commit `.env` file with VPN credentials
2. **Monitoring**: Set up CloudWatch or similar to monitor container health
3. **Backups**: Gluetun stores VPN state in `./gluetun` volume - backup if needed
4. **Updates**: Keep Gluetun updated: `docker pull qmcgaw/gluetun:latest`
5. **Rate Limiting**: Consider adding rate limiting to avoid YouTube throttling

## Useful Commands

```bash
# View all container logs
docker-compose logs -f

# Restart just one service
docker-compose restart ytdl

# Check VPN IP
docker exec gluetun curl ifconfig.me

# Check ytdl IP (should match gluetun)
docker exec ytdl curl ifconfig.me

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Rebuild after code changes
docker-compose build ytdl
docker-compose up -d ytdl

# Clean up everything
docker-compose down -v
docker network rm my-network
```

## Resources

- [Gluetun Wiki](https://github.com/qdm12/gluetun/wiki)
- [NordVPN with Gluetun](https://github.com/qdm12/gluetun/wiki/NordVPN)
- [Docker Network Modes](https://docs.docker.com/network/)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

## Support

If you encounter issues:
1. Check Gluetun logs: `docker logs gluetun`
2. Check ytdl logs: `docker logs ytdl`
3. Verify VPN IP: `docker exec gluetun curl ifconfig.me`
4. Test connectivity: `docker exec ytdl ping google.com`
5. Check Gluetun GitHub issues for similar problems
