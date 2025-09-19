# Claude Relay Service

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Redis](https://img.shields.io/badge/Redis-6+-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

**🔐 Self-hosted Claude API relay service with multi-account management** 

[中文文档](README.md) • [Preview](https://demo.pincc.ai/admin-next/login) • [Telegram Channel](https://t.me/claude_relay_service)

</div>

---

## ⭐ If You Find It Useful, Please Give It a Star!

> Open source is not easy, your Star is my motivation to continue updating 🚀  
> Join [Telegram Channel](https://t.me/claude_relay_service) for the latest updates

---

## ⚠️ Important Notice

**Please read carefully before using this project:**

🚨 **Terms of Service Risk**: Using this project may violate Anthropic's terms of service. Please carefully read Anthropic's user agreement before use. All risks from using this project are borne by the user.

📖 **Disclaimer**: This project is for technical learning and research purposes only. The author is not responsible for any account bans, service interruptions, or other losses caused by using this project.

## 🤔 Is This Project Right for You?

- 🌍 **Regional Restrictions**: Can't directly access Claude Code service in your region?
- 🔒 **Privacy Concerns**: Worried about third-party mirror services logging or leaking your conversation content?
- 👥 **Cost Sharing**: Want to share Claude Code Max subscription costs with friends?
- ⚡ **Stability Issues**: Third-party mirror sites often fail and are unstable, affecting efficiency?

If you have any of these concerns, this project might be suitable for you.

### Suitable Scenarios

✅ **Cost Sharing with Friends**: 3-5 friends sharing Claude Code Max subscription, enjoying Opus freely  
✅ **Privacy Sensitive**: Don't want third-party mirrors to see your conversation content  
✅ **Technical Tinkering**: Have basic technical skills, willing to build and maintain yourself  
✅ **Stability Needs**: Need long-term stable Claude access, don't want to be restricted by mirror sites  
✅ **Regional Restrictions**: Cannot directly access Claude official service  

### Unsuitable Scenarios

❌ **Complete Beginner**: Don't understand technology at all, don't even know how to buy a server  
❌ **Occasional Use**: Use it only a few times a month, not worth the hassle  
❌ **Registration Issues**: Cannot register Claude account yourself  
❌ **Payment Issues**: No payment method to subscribe to Claude Code  

**If you're just an ordinary user with low privacy requirements, just want to casually play around and quickly experience Claude, then choosing a mirror site you're familiar with would be more suitable.**

---

## 💭 Why Build Your Own?

### Potential Issues with Existing Mirror Sites

- 🕵️ **Privacy Risk**: Your conversation content is completely visible to others, forget about business secrets
- 🐌 **Performance Instability**: Slow when many people use it, often crashes during peak hours
- 💰 **Price Opacity**: Don't know the actual costs

### Benefits of Self-hosting

- 🔐 **Data Security**: All API requests only go through your own server, direct connection to Anthropic API
- ⚡ **Controllable Performance**: Only a few of you using it, Max $200 package basically allows you to enjoy Opus freely
- 💰 **Cost Transparency**: Clear view of how many tokens used, specific costs calculated at official prices
- 📊 **Complete Monitoring**: Usage statistics, cost analysis, performance monitoring all available

---

## 🚀 Core Features

> 📸 **[Click to view interface preview](docs/preview.md)** - See detailed screenshots of the Web management interface

### Basic Features
- ✅ **Multi-account Management**: Add multiple Claude accounts for automatic rotation
- ✅ **Custom API Keys**: Assign independent keys to each person
- ✅ **Usage Statistics**: Detailed records of how many tokens each person used

### Advanced Features
- 🔄 **Smart Switching**: Automatically switch to next account when one has issues
- 🚀 **Performance Optimization**: Connection pooling, caching to reduce latency
- 📊 **Monitoring Dashboard**: Web interface to view all data
- 🛡️ **Security Control**: Access restrictions, rate limiting
- 🌐 **Proxy Support**: Support for HTTP/SOCKS5 proxies

---

## 📋 Deployment Requirements

### Hardware Requirements (Minimum Configuration)
- **CPU**: 1 core is sufficient
- **Memory**: 512MB (1GB recommended)
- **Storage**: 30GB available space
- **Network**: Access to Anthropic API (recommend US region servers)
- **Recommendation**: 2 cores 4GB is basically enough, choose network with good return routes to your country (to improve speed, recommend not using proxy or setting server IP for direct connection)

### Software Requirements
- **Node.js** 18 or higher
- **Redis** 6 or higher
- **Operating System**: Linux recommended

### Cost Estimation
- **Server**: Light cloud server, $5-10 per month
- **Claude Subscription**: Depends on how you share costs
- **Others**: Domain name (optional)

---

## 📦 Manual Deployment

### Step 1: Environment Setup

**Ubuntu/Debian users:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Redis
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

**CentOS/RHEL users:**
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Redis
sudo yum install redis
sudo systemctl start redis
```

### Step 2: Download and Configure

```bash
# Download project
git clone https://github.com/Wei-Shaw/claude-relay-service.git
cd claude-relay-service

# Install dependencies
npm install

# Copy configuration files (Important!)
cp config/config.example.js config/config.js
cp .env.example .env
```

### Step 3: Configuration File Setup

**Edit `.env` file:**
```bash
# Generate these two keys randomly, but remember them
JWT_SECRET=your-super-secret-key
ENCRYPTION_KEY=32-character-encryption-key-write-randomly

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Edit `config/config.js` file:**
```javascript
module.exports = {
  server: {
    port: 3000,          // Service port, can be changed
    host: '0.0.0.0'     // Don't change
  },
  redis: {
    host: '127.0.0.1',  // Redis address
    port: 6379          // Redis port
  },
  // Keep other configurations as default
}
```

### Step 4: Start Service

```bash
# Initialize
npm run setup # Will randomly generate admin account password info, stored in data/init.json

# Start service
npm run service:start:daemon   # Run in background (recommended)

# Check status
npm run service:status
```

---

## 🎮 Getting Started

### 1. Open Management Interface

Browser visit: `http://your-server-IP:3000/web`

Default admin account: Look in data/init.json

### 2. Add Claude Account

This step is quite important, requires OAuth authorization:

1. Click "Claude Accounts" tab
2. If you're worried about multiple accounts sharing 1 IP getting banned, you can optionally set a static proxy IP
3. Click "Add Account"
4. Click "Generate Authorization Link", will open a new page
5. Complete Claude login and authorization in the new page
6. Copy the returned Authorization Code
7. Paste to page to complete addition

**Note**: If you're in China, this step may require VPN.

### 3. Create API Key

Assign a key to each user:

1. Click "API Keys" tab
2. Click "Create New Key"
3. Give the key a name, like "Zhang San's Key"
4. Set usage limits (optional)
5. Save, note down the generated key

### 4. Start Using Claude Code

Now you can replace the official API with your own service:

**Set environment variables:**
```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:3000/api/" # Fill in your server's IP address or domain according to actual situation
export ANTHROPIC_AUTH_TOKEN="API key created in the backend"
```

**Use claude:**
```bash
claude
```

---

## 🔧 Daily Maintenance

### Service Management

```bash
# Check service status
npm run service:status

# View logs
npm run service:logs

# Restart service
npm run service:restart:daemon

# Stop service
npm run service:stop
```

### Monitor Usage

- **Web Interface**: `http://your-domain:3000/web` - View usage statistics
- **Health Check**: `http://your-domain:3000/health` - Confirm service is normal
- **Log Files**: Various log files in `logs/` directory

### Upgrade Guide

When a new version is released, follow these steps to upgrade the service:

```bash
# 1. Navigate to project directory
cd claude-relay-service

# 2. Pull latest code
git pull origin main

# If you encounter package-lock.json conflicts, use the remote version
git checkout --theirs package-lock.json
git add package-lock.json

# 3. Install new dependencies (if any)
npm install

# 4. Restart service
npm run service:restart:daemon

# 5. Check service status
npm run service:status
```

**Important Notes:**
- Before upgrading, it's recommended to backup important configuration files (.env, config/config.js)
- Check the changelog to understand if there are any breaking changes
- Database structure changes will be migrated automatically if needed

### Common Issue Resolution

**Can't connect to Redis?**
```bash
# Check if Redis is running
redis-cli ping

# Should return PONG
```

**OAuth authorization failed?**
- Check if proxy settings are correct
- Ensure normal access to claude.ai
- Clear browser cache and retry

**API request failed?**
- Check if API Key is correct
- View log files for error information
- Confirm Claude account status is normal

---

## 🛠️ Advanced Usage

### Production Deployment Recommendations (Important!)

**Strongly recommend using Caddy reverse proxy (Automatic HTTPS)**

Recommend using Caddy as reverse proxy, it will automatically apply and renew SSL certificates with simpler configuration:

**1. Install Caddy**
```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# CentOS/RHEL/Fedora
sudo yum install yum-plugin-copr
sudo yum copr enable @caddy/caddy
sudo yum install caddy
```

**2. Caddy Configuration (Super Simple!)**

Edit `/etc/caddy/Caddyfile`:
```
your-domain.com {
    # Reverse proxy to local service
    reverse_proxy 127.0.0.1:3000 {
        # Support streaming responses (SSE)
        flush_interval -1
        
        # Pass real IP
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        
        # Timeout settings (suitable for long connections)
        transport http {
            read_timeout 300s
            write_timeout 300s
            dial_timeout 30s
        }
    }
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        -Server
    }
}
```

**3. Start Caddy**
```bash
# Test configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Start service
sudo systemctl start caddy
sudo systemctl enable caddy

# Check status
sudo systemctl status caddy
```

**4. Update service configuration**

Modify your service configuration to listen only locally:
```javascript
// config/config.js
module.exports = {
  server: {
    port: 3000,
    host: '127.0.0.1'  // Listen only locally, proxy through nginx
  }
  // ... other configurations
}
```

**Caddy Advantages:**
- 🔒 **Automatic HTTPS**: Automatically apply and renew Let's Encrypt certificates, zero configuration
- 🛡️ **Secure by Default**: Modern security protocols and cipher suites enabled by default
- 🚀 **Streaming Support**: Native support for SSE/WebSocket streaming
- 📊 **Simple Configuration**: Extremely concise configuration files, easy to maintain
- ⚡ **HTTP/2**: HTTP/2 enabled by default for improved performance

---

## 💡 Usage Recommendations

### Account Management
- **Regular Checks**: Check account status weekly, handle exceptions promptly
- **Reasonable Allocation**: Can assign different API keys to different people, analyze usage based on different API keys

### Security Recommendations
- **Use HTTPS**: Strongly recommend using Caddy reverse proxy (automatic HTTPS) to ensure secure data transmission
- **Regular Backups**: Back up important configurations and data
- **Monitor Logs**: Regularly check exception logs
- **Update Keys**: Regularly change JWT and encryption keys
- **Firewall Settings**: Only open necessary ports (80, 443), hide direct service ports

---

## 🆘 What to Do When You Encounter Problems?

### Self-troubleshooting
1. **Check Logs**: Log files in `logs/` directory
2. **Check Configuration**: Confirm configuration files are set correctly
3. **Test Connectivity**: Use curl to test if API is normal
4. **Restart Service**: Sometimes restarting fixes it

### Seeking Help
- **GitHub Issues**: Submit detailed error information
- **Read Documentation**: Carefully read error messages and documentation
- **Community Discussion**: See if others have encountered similar problems

---

## 📄 License
This project uses the [MIT License](LICENSE).

---

<div align="center">

**⭐ If you find it useful, please give it a Star, this is the greatest encouragement to the author!**

**🤝 Feel free to submit Issues for problems, welcome PRs for improvement suggestions**

</div>