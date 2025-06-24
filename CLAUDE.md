# Social Mapping App - System Overview

## Architecture
- **Frontend**: Next.js app deployed on Vercel at `https://app.socialinsight.tools`
- **Backend**: WebSocket server on Render at `https://social-mapping-socket-server.onrender.com`
- **Database**: MongoDB for persistent storage
- **Real-time**: Socket.IO for live collaboration

## Rate Limiting & Capacity
- **Current Limit**: 25 concurrent connections (production)
- **Soft Limit**: 20 connections (80% - triggers warnings)
- **Hard Limit**: 25 connections (100% - rejects new connections)
- **Memory Usage**: ~99MB RSS at full capacity (very efficient)
- **Configuration**: `websocket-server.js` lines 20-22

## Load Testing
- **Tool**: `node-capacity-test.js` - Node.js script using Socket.IO client
- **Usage**: `node node-capacity-test.js`
- **Tests**: Validates 25-connection limit, capacity warnings, and rejections
- **Results**: System handles full load with 6MB memory increase (22 extra users)

## Key Components
- **Rate Limiting**: `websocket-server.js` - connection management
- **Capacity Alerts**: `src/components/CapacityAlert.tsx` - user notifications (no counts shown)
- **Health Monitoring**: `/health` endpoint - server status and capacity info
- **WebSocket Service**: `src/core/services/websocketService.tsx` - client-side connection

## URLs
- **Main App**: https://app.socialinsight.tools/activity/{sessionId}
- **WebSocket Server**: wss://social-mapping-socket-server.onrender.com
- **Health Check**: https://social-mapping-socket-server.onrender.com/health
- **Test Activity**: https://app.socialinsight.tools/activity/m9rfm97k_zrq0o

## Commands
- **Build**: `npm run build`
- **Dev**: `npm run dev`
- **Server**: `npm run server`
- **Load Test**: `node node-capacity-test.js`
- **Health Check**: `curl https://social-mapping-socket-server.onrender.com/health`