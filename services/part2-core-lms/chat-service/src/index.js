const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 4002;

io.on('connection', (socket) => {
  console.log(`[Chat-Service] User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId, tenantId }) => {
    socket.join(`${tenantId}_${roomId}`);
    console.log(`Socket ${socket.id} joined room ${tenantId}_${roomId}`);
  });

  socket.on('send_message', (data) => {
    const { roomId, tenantId, message, sender } = data;
    io.to(`${tenantId}_${roomId}`).emit('receive_message', {
      sender,
      message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Chat-Service] User disconnected: ${socket.id}`);
  });
});

app.get('/health', (req, res) => {
  res.json({ service: 'chat-service', status: 'UP', part: 'Part 2: LMS Core & Real-Time Communication' });
});

server.listen(PORT, () => {
  console.log(`[Part 2] Real-Time Chat & Discussion Service listening on port ${PORT}`);
});
