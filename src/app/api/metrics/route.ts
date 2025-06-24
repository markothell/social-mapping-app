import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Simple in-memory metrics store
const metrics = {
  requests: 0,
  errors: 0,
  startTime: Date.now(),
  endpoints: new Map<string, { count: number; errors: number; avgResponseTime: number }>(),
};

export async function GET() {
  try {
    const uptime = Date.now() - metrics.startTime;
    const memoryUsage = process.memoryUsage();
    
    const metricsData = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000), // seconds
      requests: {
        total: metrics.requests,
        errors: metrics.errors,
        errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) : '0',
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      endpoints: Object.fromEntries(metrics.endpoints),
    };

    logger.debug('Metrics requested', { metricsData });
    
    return NextResponse.json(metricsData);
  } catch (error) {
    logger.apiError('/api/metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
}

// Helper functions to track metrics (to be used in other API routes)
export function incrementRequests(endpoint?: string) {
  metrics.requests++;
  if (endpoint) {
    const endpointMetrics = metrics.endpoints.get(endpoint) || { count: 0, errors: 0, avgResponseTime: 0 };
    endpointMetrics.count++;
    metrics.endpoints.set(endpoint, endpointMetrics);
  }
}

export function incrementErrors(endpoint?: string) {
  metrics.errors++;
  if (endpoint) {
    const endpointMetrics = metrics.endpoints.get(endpoint) || { count: 0, errors: 0, avgResponseTime: 0 };
    endpointMetrics.errors++;
    metrics.endpoints.set(endpoint, endpointMetrics);
  }
}

export function recordResponseTime(endpoint: string, responseTime: number) {
  const endpointMetrics = metrics.endpoints.get(endpoint) || { count: 0, errors: 0, avgResponseTime: 0 };
  
  // Simple moving average
  endpointMetrics.avgResponseTime = endpointMetrics.count > 1 
    ? (endpointMetrics.avgResponseTime + responseTime) / 2 
    : responseTime;
    
  metrics.endpoints.set(endpoint, endpointMetrics);
}