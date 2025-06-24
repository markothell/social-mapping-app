# App Monitoring Setup Guide

## What's Been Added

### 1. Health Check Endpoint
- **URL**: `/api/health`
- **Purpose**: Single endpoint to check all service health
- **Returns**: JSON with status, uptime, memory usage, service status

### 2. Metrics Endpoint  
- **URL**: `/api/metrics`
- **Purpose**: Performance metrics and request statistics
- **Returns**: Request counts, error rates, memory usage, response times

### 3. Logger Utility
- **Location**: `src/utils/logger.ts`
- **Purpose**: Structured logging with levels (info, warn, error, debug)
- **Features**: Production-ready with external logging hooks

## Quick Start

### Test Your Endpoints
```bash
# Check health status
curl http://localhost:3000/api/health

# View metrics
curl http://localhost:3000/api/metrics
```

## Free Monitoring Options

### 1. UptimeRobot (Recommended to Start)
- **Setup**: Create account at uptimerobot.com
- **Monitor**: `https://yourapp.com/api/health`
- **Alerts**: Email/SMS when site is down
- **Free tier**: 50 monitors, 5-minute intervals

### 2. StatusCake
- **Setup**: Create account at statuscake.com
- **Monitor**: `https://yourapp.com/api/health`
- **Free tier**: Basic uptime monitoring

### 3. Simple Cron Script
```bash
# Add to crontab (crontab -e)
*/5 * * * * curl -f https://yourapp.com/api/health || echo "Site down!" | mail -s "Alert" your@email.com
```

## Next Steps (As You Grow)

### 1. Error Tracking
- Add Sentry for error tracking and performance monitoring
- Free tier covers small apps

### 2. Advanced Monitoring
- **Grafana Cloud**: Free tier with dashboards
- **New Relic**: Free tier for small apps
- **Uptime Kuma**: Self-hosted monitoring dashboard

### 3. Log Aggregation
- Modify `logger.ts` to send logs to external service
- Options: LogRocket, Papertrail, or custom endpoint

## Usage in Your Code

### Replace console.log with structured logging:
```typescript
import { logger } from '@/utils/logger';

// Instead of: console.log('User created')
logger.info('User created', { userId: '123', email: 'user@example.com' });

// Instead of: console.error('Database error', error)
logger.error('Database connection failed', { operation: 'userCreate' }, error);
```

### Track API performance:
```typescript
import { incrementRequests, incrementErrors, recordResponseTime } from '@/app/api/metrics/route';

export async function POST(request: Request) {
  const startTime = Date.now();
  incrementRequests('/api/users');
  
  try {
    // Your API logic here
    recordResponseTime('/api/users', Date.now() - startTime);
    return NextResponse.json({ success: true });
  } catch (error) {
    incrementErrors('/api/users');
    throw error;
  }
}
```

## Load Testing

### Alternative Tools (Artillery has deprecated dependencies)

**Recommended: k6** (modern, lightweight)
```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/docs/get-started/installation/

# Create k6 test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up
    { duration: '2m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function() {
  // Health check
  let healthRes = http.get('http://localhost:3000/api/health');
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'memory RSS < 600MB': (r) => JSON.parse(r.body).memory.rss < 600,
  });
  
  // Metrics check
  let metricsRes = http.get('http://localhost:3000/api/metrics');
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
  });
  
  // WebSocket server health
  let wsRes = http.get('http://localhost:3001/health');
  check(wsRes, {
    'websocket server healthy': (r) => r.status === 200,
  });
}
EOF

# Run load test
k6 run load-test.js
```

**Alternative: autocannon** (Node.js native)
```bash
npm install -g autocannon

# Quick load test
autocannon -c 10 -d 60 http://localhost:3000/api/health
```

### Memory Usage Monitoring During Tests

**Watch memory in real-time:**
```bash
# Terminal 1: Run load test
k6 run load-test.js

# Terminal 2: Watch memory usage
watch -n 2 'curl -s http://localhost:3000/api/health | jq ".memory"'
```

**Acceptable memory thresholds:**
- RSS < 600MB for 20 users
- RSS < 800MB for 50 users  
- RSS < 1GB for 100 users
- Alert if RSS grows >50MB/hour (potential leak)

## Monitoring Checklist

- [ ] Test health endpoint locally
- [ ] Run load test with k6 or autocannon
- [ ] Verify memory usage stays under thresholds
- [ ] Deploy and test health endpoint in production
- [ ] Set up UptimeRobot monitoring
- [ ] Configure email/SMS alerts (RSS >600MB)
- [ ] Replace console.log statements with logger
- [ ] Add metrics tracking to key API routes
- [ ] Run weekly load tests to check for regressions
- [ ] Set up log aggregation service (future)
- [ ] Add error tracking service (future)