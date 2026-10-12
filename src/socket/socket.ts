import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Notification } from '../models/Interactions.js';

let io: Server | null = null;
const userSockets = new Map<string, string>(); // userId -> socketId

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Register user to socket session
    socket.on('register', (userId: string) => {
      if (userId) {
        userSockets.set(userId, socket.id);
        console.log(`Registered user ${userId} to socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean up map
      for (const [userId, sockId] of userSockets.entries()) {
        if (sockId === socket.id) {
          userSockets.delete(userId);
          console.log(`Unregistered user ${userId}`);
          break;
        }
      }
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Real-Time Notification Trigger
export const sendRealTimeNotification = async (
  recipientId: string,
  title: string,
  message: string,
  type: 'assignment' | 'marks' | 'attendance' | 'enrollment' | 'general' | 'announcement'
): Promise<void> => {
  try {
    // 1. Persist notification in DB
    const notification = await Notification.create({
      recipientId,
      title,
      message,
      type,
    });

    // 2. Push to socket if online
    if (io) {
      const socketId = userSockets.get(recipientId);
      if (socketId) {
        io.to(socketId).emit('notification', notification);
        console.log(`Real-time notification pushed to user ${recipientId}`);
      }
    }
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
  }
};

// Global announcement broadcast
export const broadcastAnnouncement = (announcement: any) => {
  if (io) {
    io.emit('announcement', announcement);
    console.log('Real-time announcement broadcasted');
  }
};
