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
  
  return NextResponse.json(healthData, { 
    status: isHealthy ? 200 : 503 
  });
}

async function checkDatabaseHealth() {
  try {
    const response = await fetch(`${process.env.WEBSOCKET_SERVER_URL || 'http://localhost:3001'}/health`);
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
    const response = await fetch(`${process.env.WEBSOCKET_SERVER_URL || 'http://localhost:3001'}/health`);
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