const express = require('express');
const mongoose = require('mongoose');
const { checkRedisHealth } = require('../config/redis');

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function createHealthRouter(io, roomManager) {
  const router = express.Router();

  const handleHealth = async (req, res) => {
    const mongoStateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    const mongoReadyState = mongoose.connection ? mongoose.connection.readyState : 0;
    const mongoStatus = mongoStateMap[mongoReadyState] || 'unknown';

    const redisHealth = await checkRedisHealth();

    // Memory usage in Megabytes (rounded to 2 decimal places)
    const mem = process.memoryUsage();
    const toMb = (bytes) => Number((bytes / (1024 * 1024)).toFixed(2));

    const rooms = roomManager?.rooms ? roomManager.rooms : new Map();
    let totalSpectators = 0;
    let playingRoomsCount = 0;
    rooms.forEach(r => {
      if (r.spectators) totalSpectators += r.spectators.length;
      if (r.state === 'PLAYING') playingRoomsCount++;
    });

    const connectedSockets = io?.sockets?.sockets ? io.sockets.sockets.size : 0;

    const isHealthy = mongoReadyState === 1;
    const overallStatus = isHealthy ? 'ok' : 'degraded';

    const responsePayload = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      uptimeFormatted: formatUptime(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        mongodb: {
          status: mongoStatus,
          readyState: mongoReadyState,
          healthy: isHealthy
        },
        redis: redisHealth
      },
      metrics: {
        activeRooms: rooms.size,
        playingRooms: playingRoomsCount,
        connectedSockets,
        totalSpectators
      },
      system: {
        nodeVersion: process.version,
        pid: process.pid,
        memory: {
          rssMb: toMb(mem.rss),
          heapTotalMb: toMb(mem.heapTotal),
          heapUsedMb: toMb(mem.heapUsed),
          externalMb: toMb(mem.external)
        }
      }
    };

    // If query ?ready=true is passed for strict readiness probe
    if (req.query.ready === 'true' && !isHealthy) {
      return res.status(503).json(responsePayload);
    }

    return res.status(200).json(responsePayload);
  };

  router.get('/', handleHealth);

  return { router, handleHealth };
}

module.exports = {
  createHealthRouter
};
