let io = null;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.handshake.query;
    if (userId) socket.join(`user:${userId}`);
    if (role) socket.join(`role:${role}`);

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIO = () => io;

const emitToRole = (role, event, data) => {
  if (io) io.to(`role:${role}`).emit(event, data);
};

const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

const emitToAll = (event, data) => {
  if (io) io.emit(event, data);
};

module.exports = { initSocket, getIO, emitToRole, emitToUser, emitToAll };
