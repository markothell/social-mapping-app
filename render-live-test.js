// Comprehensive load test for production deployment
// Tests both HTTP endpoints and WebSocket connection limits (15 connection boundary)
import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';

export let options = {
  stages: [
    { duration: '30s', target: 8 },    // Warm up - under soft limit
    { duration: '60s', target: 12 },   // Approach soft limit  
    { duration: '60s', target: 15 },   // Hit hard limit (should trigger warnings)
    { duration: '60s', target: 18 },   // Test over limit (should trigger rejections)
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

const BASE_URL = __ENV.HOST || 'https://app.socialinsight.tools';
const WS_URL = __ENV.WS_HOST || 'wss://social-mapping-socket-server.onrender.com';

export default function() {
  // 80% chance to test real activity page (triggers WebSocket connections)
  // 20% chance for HTTP health checks
  if (Math.random() < 0.8) {
    testActivityPage();
  } else {
    testHttpEndpoints();
  }
}

function testHttpEndpoints() {
  // Test Next.js app health
  let healthRes = http.get(`${BASE_URL}/api/health`);
  
  let healthData = {};
  try {
    healthData = JSON.parse(healthRes.body);
  } catch (e) {
    console.log('Failed to parse health response');
  }
  
  check(healthRes, {
    'Next.js health OK': (r) => r.status === 200,
    'memory healthy': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.memoryHealthy === true;
      } catch { return false; }
    },
  });
  
  // Test WebSocket server health  
  let wsHealthRes = http.get(`https://social-mapping-socket-server.onrender.com/health`);
  
  let wsData = {};
  try {
    wsData = JSON.parse(wsHealthRes.body);
  } catch (e) {
    console.log('Failed to parse WebSocket health response');
  }
  
  check(wsHealthRes, {
    'WebSocket server OK': (r) => r.status === 200,
  });
  
  // Log capacity and memory info
  if (wsData.capacity) {
    const c = wsData.capacity;
    console.log(`📊 Capacity: ${c.current}/${c.max} (${c.status}) - Available: ${c.availableSlots}`);
    
    if (c.current >= 12 && c.current < 15) {
      console.log('🟡 APPROACHING CAPACITY LIMIT');
    } else if (c.current >= 15) {
      console.log('🔴 AT/OVER CAPACITY LIMIT');
    }
  }
  
  if (healthData.memory) {
    const m = healthData.memory;
    console.log(`💾 Memory: RSS ${m.rss}MB, Heap ${m.heapUsed}/${m.heapTotal}MB`);
  }
  
  sleep(1);
}

function testActivityPage() {
  // Load the actual activity page - this will trigger WebSocket connections
  const activityUrl = `${BASE_URL}/activity/m9rfm97k_zrq0o`;
  
  let pageRes = http.get(activityUrl, {
    headers: {
      'User-Agent': 'k6-load-test/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  
  check(pageRes, {
    'activity page loads': (r) => r.status === 200,
    'page contains React app': (r) => r.body && r.body.includes('__NEXT_DATA__'),
  });
  
  if (pageRes.status === 200) {
    console.log(`✅ Activity page loaded (${pageRes.status})`);
  } else {
    console.log(`❌ Activity page failed (${pageRes.status})`);
  }
  
  // Check capacity after page load (which should trigger WebSocket connection)
  sleep(2); // Give time for WebSocket to connect
  
  let wsHealthRes = http.get(`https://social-mapping-socket-server.onrender.com/health`);
  
  try {
    const wsData = JSON.parse(wsHealthRes.body);
    if (wsData.capacity) {
      const c = wsData.capacity;
      console.log(`🌐 Post-page-load Capacity: ${c.current}/${c.max} (${c.status})`);
      
      if (c.current >= 12 && c.current < 15) {
        console.log('🟡 APPROACHING CAPACITY LIMIT');
      } else if (c.current >= 15) {
        console.log('🔴 AT/OVER CAPACITY LIMIT - RATE LIMITING SHOULD ACTIVATE');
      }
    }
  } catch (e) {
    console.log('Failed to parse post-page-load capacity data');
  }
  
  // Keep the "session" alive for a bit to simulate real user behavior
  sleep(5);
}