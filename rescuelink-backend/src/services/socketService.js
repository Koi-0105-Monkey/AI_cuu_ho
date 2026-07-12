let io;
const Incident = require('../models/Incident');

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    const jwt = require('jsonwebtoken');
    io = new Server(server, {
      cors: {
        origin: '*',
      }
    });

    // Authentication middleware for Socket.io
    io.use((socket, next) => {
      const isTest = process.env.NODE_ENV === 'test';
      if (isTest) {
        return next();
      }

      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.split(' ')[1] || 
                    socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication error: Token is required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Token is invalid'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      socket.on('watch:trip', (data) => {
        if (data && data.tripId) {
          socket.join(`trip:${data.tripId}`);
          console.log(`Socket ${socket.id} joined room trip:${data.tripId}`);
        }
      });

      // Handle incident assignment from dashboard
      socket.on('incident:assign', async (data) => {
        try {
          const { incidentId, rescueTeamId } = data;
          if (!incidentId) return;

          const incident = await Incident.findByIdAndUpdate(
            incidentId,
            { status: 'assigned', message: `Đã bàn giao cho đội cứu hộ. Đội cứu hộ: ${rescueTeamId || 'Chưa rõ'}` },
            { new: true }
          ).populate('userId', 'name phone');

          if (incident) {
            io.emit('incident:updated', incident);
            console.log(`Incident ${incidentId} assigned to team ${rescueTeamId}`);
          }
        } catch (error) {
          console.error(`Socket error incident:assign: ${error.message}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
  emitIncidentNew: (incident) => {
    if (io) io.emit('incident:new', incident);
  },
  emitNewIncident: (incident) => {
    if (io) io.emit('incident:new', incident);
  },
  emitIncidentUpdated: (incident) => {
    if (io) io.emit('incident:updated', incident);
  },
  emitGpsUpdate: (data) => {
    if (io) {
      io.emit('gps:update', data);
      io.to(`trip:${data.tripId}`).emit('gps:update_room', data);
    }
  },
  emitTripOverdue: (trip) => {
    if (io) io.emit('trip:overdue', trip);
  },
  emitThreatNew: (threat) => {
    if (io) io.emit('threat:new', threat);
  },
  emitThreatUpdated: (threat) => {
    if (io) io.emit('threat:updated', threat);
  }
};
