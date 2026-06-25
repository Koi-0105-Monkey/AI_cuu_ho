let io;
const Incident = require('../models/Incident');

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: '*',
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
  }
};
