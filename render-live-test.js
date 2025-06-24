// Load test for live Render deployment with 512MB RAM
import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';

export let options = {
  stages: [
    { duration: '1m', target: 5 },    // Gentle start
    { duration: '2m', target: 10 },   // Approach soft limit (12)
    { duration: '2m', target: 15 },   // Hit hard limit (15)
    { duration: '1m', target: 20 },   // Test rejection (over 15)
    { duration: '1m', target: 0 },    // Ramp down
  ],
};

const BASE_URL = __ENV.HOST || 'https://your-app.onrender.com';
const WS_URL = __ENV.WS_HOST || 'wss://your-app.onrender.com:3001';

export default function() {
  // Test health endpoint
  let healthRes = http.get(`${BASE_URL}/api/health`);
  
  let healthData = {};
  try {
    healthData = JSON.parse(healthRes.body);
  } catch (e) {
    console.log('Failed to parse health response');
  }
  
  check(healthRes, {
    'health endpoint responding': (r) => r.status === 200,
    'memory under 450MB': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.memory && data.memory.rss < 450;
      } catch { return false; }
    },
    'memory is healthy': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.memoryHealthy === true;
      } catch { return false; }
    },
  });
  
  // Test WebSocket server health
  let wsHealthRes = http.get(`${BASE_URL}:3001/health`);
  
  let wsData = {};
  try {
    wsData = JSON.parse(wsHealthRes.body);
  } catch (e) {
    console.log('Failed to parse WebSocket health response');
  }
  
  check(wsHealthRes, {
    'websocket server responding': (r) => r.status === 200,
    'connections under limit': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.capacity && data.capacity.current <= data.capacity.max;
      } catch { return false; }
    },
  });
  
  // Log capacity info
  if (wsData.capacity) {
    const capacity = wsData.capacity;
    console.log(`Capacity: ${capacity.current}/${capacity.max} (${capacity.status}) - Available: ${capacity.availableSlots}`);
    
    if (capacity.status === 'full') {
      console.log('🚨 Server at capacity!');
    } else if (capacity.status === 'high') {
      console.log('⚠️ Server approaching capacity');
    }
  }
  
  // Log memory usage
  if (healthData.memory) {
    const mem = healthData.memory;
    console.log(`Memory: RSS ${mem.rss}MB, Heap ${mem.heapUsed}MB/${mem.heapTotal}MB, External ${mem.external}MB`);
    
    if (mem.rss > 400) {
      console.log('⚠️ High memory usage detected');
    }
  }
  
  sleep(2);
}

// Alternative function to test WebSocket connections directly
export function testWebSocketConnections() {
  const wsRes = ws.connect(WS_URL, function (socket) {
    socket.on('open', function open() {
      console.log('WebSocket connected');
    });
    
    socket.on('message', function message(data) {
      const msg = JSON.parse(data);
      
      if (msg.type === 'connection_rejected') {
        console.log(`🚨 Connection rejected: ${msg.message}`);
      } else if (msg.type === 'capacity_warning') {
        console.log(`⚠️ Capacity warning: ${msg.message}`);
      } else if (msg.type === 'connection_accepted') {
        console.log(`✅ Connection accepted: ${msg.currentConnections}/${msg.maxConnections}`);
      }
    });
    
    socket.on('close', function close() {
      console.log('WebSocket disconnected');
    });
    
    socket.on('error', function error(e) {
      console.log('WebSocket error:', e);
    });
    
    // Keep connection alive for a bit
    sleep(5);
  });
  
  check(wsRes, {
    'websocket connection successful': (r) => r && r.status === 101,
  });
}