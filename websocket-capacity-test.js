// Direct WebSocket capacity test - tests the 15 connection limit
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '30s', target: 8 },    // Under soft limit
    { duration: '30s', target: 12 },   // Approach soft limit  
    { duration: '30s', target: 15 },   // Hit hard limit
    { duration: '30s', target: 18 },   // Over limit (should reject)
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

const WS_URL = 'wss://social-mapping-socket-server.onrender.com';
const ORIGIN = 'https://app.socialinsight.tools';

export default function() {
  // Create WebSocket connection (server allows undefined origin)
  const wsRes = ws.connect(WS_URL, function (socket) {
    
    socket.on('open', function open() {
      console.log(`🔗 WebSocket connected (VU ${__VU})`);
      
      // Join the test activity to simulate real usage
      socket.send(JSON.stringify({
        type: 'join_activity',
        data: {
          activityId: 'm9rfm97k_zrq0o',
          userId: `load-test-user-${__VU}-${Date.now()}`,
          userName: `LoadTestUser${__VU}`
        }
      }));
    });
    
    socket.on('message', function message(data) {
      try {
        const msg = JSON.parse(data);
        
        if (msg.type === 'connection_rejected') {
          console.log(`🚨 CONNECTION REJECTED (VU ${__VU}): ${msg.message} - ${msg.currentConnections}/${msg.maxConnections}`);
        } else if (msg.type === 'capacity_warning') {
          console.log(`⚠️ CAPACITY WARNING (VU ${__VU}): ${msg.message} - ${msg.currentConnections}/${msg.maxConnections}`);
        } else if (msg.type === 'connection_accepted') {
          console.log(`✅ CONNECTION ACCEPTED (VU ${__VU}): ${msg.currentConnections}/${msg.maxConnections}`);
        }
      } catch (e) {
        // Non-JSON message or parsing error, ignore
      }
    });
    
    socket.on('close', function close() {
      console.log(`🔌 WebSocket disconnected (VU ${__VU})`);
    });
    
    socket.on('error', function error(e) {
      console.log(`❌ WebSocket error (VU ${__VU}):`, e);
    });
    
    // Keep connection alive to test capacity limits
    sleep(4);
  });
  
  check(wsRes, {
    'WebSocket connection attempted': (r) => r !== null,
  });
  
  // Also check server capacity via HTTP
  let healthRes = http.get('https://social-mapping-socket-server.onrender.com/health');
  
  try {
    const data = JSON.parse(healthRes.body);
    if (data.capacity) {
      const c = data.capacity;
      console.log(`📊 Server Capacity: ${c.current}/${c.max} (${c.status}) - Available: ${c.availableSlots}`);
      
      if (c.current >= 12 && c.current < 15) {
        console.log('🟡 APPROACHING CAPACITY LIMIT');
      } else if (c.current >= 15) {
        console.log('🔴 AT/OVER CAPACITY LIMIT - RATE LIMITING ACTIVE');
      }
    }
  } catch (e) {
    // Health check failed
  }
}