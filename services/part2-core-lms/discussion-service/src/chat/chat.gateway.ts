import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private logger: Logger = new Logger('ChatGateway');

  // Mapping from threadId to set of socketIds
  private activeTyping = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Cleanup typing indicators
    for (const [threadId, sockets] of this.activeTyping.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        this.server.to(threadId).emit('typing', {
          userId: 'anonymous', // In real app, map socket to user
          isTyping: false
        });
      }
    }
  }

  @SubscribeMessage('joinThread')
  handleJoinThread(client: Socket, threadId: string) {
    client.join(threadId);
    this.logger.log(`Client ${client.id} joined thread ${threadId}`);
    return { event: 'joined', data: threadId };
  }

  @SubscribeMessage('leaveThread')
  handleLeaveThread(client: Socket, threadId: string) {
    client.leave(threadId);
    return { event: 'left', data: threadId };
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { threadId: string, userId: string, isTyping: boolean }) {
    if (!this.activeTyping.has(payload.threadId)) {
      this.activeTyping.set(payload.threadId, new Set());
    }
    const sockets = this.activeTyping.get(payload.threadId);
    if (payload.isTyping) {
      sockets?.add(client.id);
    } else {
      sockets?.delete(client.id);
    }
    
    // Broadcast to others in the thread
    client.broadcast.to(payload.threadId).emit('typing', payload);
  }

  // Called from ThreadsController when a new post is created
  broadcastNewPost(threadId: string, post: any) {
    this.server.to(threadId).emit('newPost', post);
  }
}
