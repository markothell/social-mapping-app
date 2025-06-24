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

## Monitoring Checklist

- [ ] Test health endpoint locally
- [ ] Deploy and test health endpoint in production
- [ ] Set up UptimeRobot monitoring
- [ ] Configure email/SMS alerts
- [ ] Replace console.log statements with logger
- [ ] Add metrics tracking to key API routes
- [ ] Set up log aggregation service (future)
- [ ] Add error tracking service (future)