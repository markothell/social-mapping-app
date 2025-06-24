#!/usr/bin/env node

// Node.js script to test WebSocket capacity with actual Socket.IO client
const { io } = require('socket.io-client');

const WS_URL = 'https://social-mapping-socket-server.onrender.com';
const TARGET_CONNECTIONS = 28; // Test beyond the 25 limit

let connectedSockets = [];
let connectionCount = 0;
let rejectedCount = 0;

console.log(`🚀 Starting capacity test: attempting ${TARGET_CONNECTIONS} connections`);
console.log(`📡 Target server: ${WS_URL}`);
console.log(`🎯 Expected limit: 25 connections\n`);

function createConnection(index) {
  return new Promise((resolve) => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      timeout: 5000,
    });

    socket.on('connect', () => {
      connectionCount++;
      connectedSockets.push(socket);
      console.log(`✅ Connection ${index + 1} established (${connectionCount}/${TARGET_CONNECTIONS})`);
      
      // Join the test activity
      socket.emit('join_activity', {
        activityId: 'm9rfm97k_zrq0o',
        userId: `load-test-user-${index}-${Date.now()}`,
        userName: `LoadTestUser${index + 1}`
      });
      
      resolve({ success: true, socket });
    });

    socket.on('connection_rejected', (data) => {
      rejectedCount++;
      console.log(`🚨 Connection ${index + 1} REJECTED: ${data.message} (${data.currentConnections}/${data.maxConnections})`);
      socket.disconnect();
      resolve({ success: false, reason: 'rejected', data });
    });

    socket.on('capacity_warning', (data) => {
      console.log(`⚠️ Connection ${index + 1} got capacity warning: ${data.message} (${data.currentConnections}/${data.maxConnections})`);
    });

    socket.on('connection_accepted', (data) => {
      console.log(`✅ Connection ${index + 1} officially accepted (${data.currentConnections}/${data.maxConnections})`);
    });

    socket.on('connect_error', (error) => {
      console.log(`❌ Connection ${index + 1} failed:`, error.message);
      resolve({ success: false, reason: 'error', error });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Connection ${index + 1} disconnected:`, reason);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!socket.connected) {
        console.log(`⏰ Connection ${index + 1} timed out`);
        socket.disconnect();
        resolve({ success: false, reason: 'timeout' });
      }
    }, 10000);
  });
}

async function runTest() {
  const startTime = Date.now();
  
  // Create connections with a small delay between each
  for (let i = 0; i < TARGET_CONNECTIONS; i++) {
    console.log(`\n🔄 Attempting connection ${i + 1}...`);
    
    const result = await createConnection(i);
    
    if (!result.success) {
      if (result.reason === 'rejected') {
        console.log(`🛑 Hit capacity limit at connection ${i + 1}`);
        break;
      }
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n📊 TEST RESULTS:`);
  console.log(`⏱️  Total duration: ${duration} seconds`);
  console.log(`✅ Successful connections: ${connectionCount}`);
  console.log(`🚨 Rejected connections: ${rejectedCount}`);
  console.log(`🎯 Expected capacity limit: 25`);
  
  if (connectionCount >= 25) {
    console.log(`🟢 CAPACITY LIMIT WORKING: Got ${connectionCount} connections, rejections should start after 25`);
  } else {
    console.log(`🟡 BELOW CAPACITY: Only ${connectionCount} connections established`);
  }

  // Keep connections alive for a moment to verify they stay connected
  console.log(`\n⏳ Keeping connections alive for 10 seconds...`);
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Clean up
  console.log(`\n🧹 Cleaning up connections...`);
  connectedSockets.forEach(socket => socket.disconnect());
  
  console.log(`✨ Test complete!`);
  process.exit(0);
}

runTest().catch(console.error);