# Production Deployment Checklist

## 🔧 Environment-Specific Settings

### Development vs Production Configuration

| Setting | Development | Production | Reason |
|---------|-------------|------------|---------|
| MongoDB Max Pool | 3 connections | 20 connections | Handle more concurrent users |
| MongoDB Min Pool | 1 connection | 5 connections | Keep connections ready |
| Connection Idle Time | 15 seconds | 30 seconds | Balance cleanup vs performance |
| Cleanup Interval | 10 seconds | 30 seconds | Less aggressive monitoring |
| Stale Cleanup | 30 seconds | 2 minutes | Reduce overhead |
| Memory Threshold RSS | 600MB | 2000MB | Allow for larger user base |
| Memory Threshold Heap | 400MB | 1500MB | More JS processing capacity |

## 📊 Production Memory Expectations

### Expected Memory Usage by User Count:
- **0-20 users**: 300-600MB RSS
- **20-50 users**: 600-1000MB RSS  
- **50-100 users**: 1000-1500MB RSS
- **100+ users**: 1500-2000MB RSS

### Warning Thresholds:
- **RSS >1000MB**: High memory usage warning
- **Connections >200**: High connection count warning
- **Activities >50**: High activity count warning

## 🚀 Pre-Deployment Steps

### 1. Environment Variables
```bash
# .env.production
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
CLIENT_URL=https://yourdomain.com
WEBSOCKET_SERVER_URL=https://yourdomain.com:3001
PORT=3001
```

### 2. Server Configuration
```bash
# For production servers with more memory
export NODE_OPTIONS="--max-old-space-size=4096"  # 4GB heap limit
```

### 3. Process Management
```bash
# Use PM2 for production process management
npm install -g pm2

# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'social-mapping-app',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'websocket-server',
      script: 'websocket-server.js',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};

# Start with PM2
pm2 start ecosystem.config.js --env production
```

## 📈 Production Monitoring Setup

### 1. Health Check Configuration
```bash
# Your health endpoint now returns production-appropriate thresholds
curl https://yourdomain.com/api/health

# Should show:
# {
#   "thresholds": {"rss": 2000, "heap": 1500},
#   "memoryHealthy": true,
#   "memory": {"rss": 800, "heapUsed": 600, ...}
# }
```

### 2. UptimeRobot Production Settings
- **URL**: `https://yourdomain.com/api/health`
- **Check interval**: 5 minutes
- **Alert conditions**: 
  - Status code ≠ 200
  - Response time >5 seconds
  - Memory thresholds exceeded (returns 503)

### 3. Log Management
```bash
# Production logging with PM2
pm2 logs social-mapping-app --lines 100
pm2 logs websocket-server --lines 100

# Set up log rotation
pm2 install pm2-logrotate
```

## 🔍 Production Load Testing

### Before Going Live:
```bash
# Test with k6 against production environment
k6 run -e HOST=https://yourdomain.com load-test-production.js

# Monitor during test
watch -n 5 'curl -s https://yourdomain.com/api/health | jq ".memory"'
```

### Production Load Test Script:
```javascript
// load-test-production.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '5m', target: 20 },   // Ramp to 20 users
    { duration: '10m', target: 50 },  // Ramp to 50 users
    { duration: '5m', target: 100 },  // Peak at 100 users
    { duration: '10m', target: 0 },   // Ramp down
  ],
};

export default function() {
  let healthRes = http.get(`${__ENV.HOST}/api/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'memory RSS < 2000MB': (r) => JSON.parse(r.body).memory.rss < 2000,
    'memory is healthy': (r) => JSON.parse(r.body).memoryHealthy === true,
  });
}
```

## ⚠️ Production Alerts Setup

### Critical Alerts (Immediate Response):
- Health endpoint returns 503
- Memory RSS >1800MB for >5 minutes
- WebSocket server down
- Database connection failed

### Warning Alerts (Monitor):
- Memory RSS >1200MB
- Connection count >150
- Response time >2 seconds
- Error rate >1%

## 🚨 Emergency Procedures

### If Memory Exceeds Limits:
1. Check current load: `curl https://yourdomain.com/api/metrics`
2. Review recent activity: `pm2 logs websocket-server --lines 50`
3. If memory leak suspected: `pm2 restart all`
4. Monitor recovery: `watch curl -s https://yourdomain.com/api/health`

### If Performance Degrades:
1. Check database connection pool
2. Monitor WebSocket connection count
3. Review cleanup interval logs
4. Consider scaling horizontally

## ✅ Go-Live Checklist

- [ ] Environment variables configured
- [ ] Production database connected
- [ ] PM2 process management configured
- [ ] Health endpoints tested in production
- [ ] UptimeRobot monitoring configured
- [ ] Load testing completed successfully
- [ ] Alert thresholds configured
- [ ] Log rotation configured
- [ ] Emergency procedures documented
- [ ] Backup/recovery plan in place