import { NextResponse } from 'next/server';

export async function GET() {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '0.1.0',
    services: {
      database: await checkDatabaseHealth(),
      websocket: await checkWebSocketHealth(),
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // Total physical memory used
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // JS heap used
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // JS heap allocated
      external: Math.round(process.memoryUsage().external / 1024 / 1024), // C++ objects bound to JS
    }
  };

  const isHealthy = Object.values(healthData.services).every(service => service.status === 'healthy');
  
  // Environment-specific health thresholds (updated for 512MB Render)
  const memoryThresholds = {
    development: { rss: 600, heap: 400 },
    production: { rss: 450, heap: 350 }  // Conservative for 512MB server
  };
  
  const env = process.env.NODE_ENV || 'development';
  const thresholds = memoryThresholds[env] || memoryThresholds.development;
  
  // Check memory thresholds
  const memoryHealthy = healthData.memory.rss < thresholds.rss && 
                       healthData.memory.heapUsed < thresholds.heap;
  
  healthData.thresholds = thresholds;
  healthData.memoryHealthy = memoryHealthy;
  
  return NextResponse.json(healthData, { 
    status: (isHealthy && memoryHealthy) ? 200 : 503 
  });
}

async function checkDatabaseHealth() {
  try {
    const websocketUrl = process.env.WEBSOCKET_SERVER_URL || 'https://social-mapping-socket-server.onrender.com';
    const response = await fetch(`${websocketUrl}/health`);
    const data = await response.json();
    
    return {
      status: data.mongodb === 'connected' ? 'healthy' : 'unhealthy',
      connections: data.connections || 0,
      apiRoutesLoaded: data.apiRoutesLoaded || false
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Cannot reach websocket server'
    };
  }
}

async function checkWebSocketHealth() {
  try {
    const websocketUrl = process.env.WEBSOCKET_SERVER_URL || 'https://social-mapping-socket-server.onrender.com';
    const response = await fetch(`${websocketUrl}/health`);
    const data = await response.json();
    
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      connections: data.connections || 0
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'WebSocket server unreachable'
    };
  }
}