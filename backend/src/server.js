import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import ticketRoutes from './routes/ticket.js';
import organizationRoutes from './routes/organizations.js';
import chatRoutes from './routes/chat.js';
import timesheetRoutes from './routes/timesheets.js';
import performanceRoutes from './routes/performance.js';
import worklogRoutes from './routes/worklog.js';
import superadminRoutes from './routes/superadmin.js';
import settingsRoutes from './routes/settings.js';
import notificationRoutes from './routes/notifications.js';
import billingRoutes from './routes/billing.js';
import { getPublicSettings } from './controllers/settingsController.js';
import { errorHandler } from './middleware/errorHandler.js';
import prisma from './lib/prisma.js';
import { attachIo } from './middleware/socketMiddleware.js';


dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(attachIo(io));

app.use('/api/auth', authRoutes);
app.use('/api/public/settings', getPublicSettings);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/superadmin/settings', settingsRoutes);
app.use('/api/superadmin/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const { roomId, organizationId } = typeof data === 'string' ? { roomId: data } : data;
    
    // Scoped room for global chat, or direct projectId for project chat
    const targetRoom = roomId === 'global' ? `global-${organizationId}` : roomId;
    
    socket.join(targetRoom);
    
    // Also join an organization-wide room for general notifications
    if (organizationId) {
      socket.join(`org-${organizationId}`);
    }
    
    console.log(`User ${socket.id} joined room: ${targetRoom} (Org: ${organizationId})`);
  });

  socket.on('send-message', async (data) => {
    const { content, userId, projectId, organizationId, snippet } = data;
    try {
      // Use the standard prisma client for all chat messages
      const tenantDb = prisma;

      const message = await tenantDb.chatMessage.create({
        data: { 
          content, 
          userId, 
          projectId, 
          organizationId 
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      const targetRoom = projectId || `global-${organizationId}`;

      // Deliver message to users IN the room
      io.to(targetRoom).emit('new-message', message);

      // Broadcast lightweight notification
      const notificationChannel = organizationId ? io.to(`org-${organizationId}`) : io;
      
      notificationChannel.emit('message-notification', {
        roomId: projectId || 'global',
        senderId: userId,
        content: message.content,
        senderName: message.user.name,
      });

      // Create persistent Notifications for users not in the current room
      // To keep it efficient, we only notify project members or all org members for global
      const project = projectId ? await tenantDb.project.findUnique({
        where: { id: projectId },
        include: { 
          tasks: { include: { assignees: true } },
          manager: true,
          client: true
        }
      }) : null;

      let targetUserIds = [];
      if (projectId && project) {
        // Collect all project members
        const assignees = new Set();
        project.tasks.forEach(t => t.assignees.forEach(a => assignees.add(a.userId)));
        targetUserIds = Array.from(assignees);
        if (project.managerId) targetUserIds.push(project.managerId);
        if (project.clientId) targetUserIds.push(project.clientId);
      } else {
        // Global chat: Notify everyone in the organization
        const orgUsers = await tenantDb.user.findMany({
          where: { organizationId },
          select: { id: true }
        });
        targetUserIds = orgUsers.map(u => u.id);
      }

      // Filter out the sender and duplicates
      const finalTargets = [...new Set(targetUserIds)].filter(id => id !== userId);

      // Create persistent notifications in bulk (or sequential if Prisma doesn't support bulk well on all setups)
      for (const targetId of finalTargets) {
        const notif = await tenantDb.notification.create({
          data: {
            userId: targetId,
            organizationId,
            type: 'CHAT_MESSAGE',
            title: projectId ? `Message in ${project.name}` : 'General Message',
            message: `${message.user.name}: ${snippet || 'sent an encrypted message'}`,
          }
        });
        // Emit specifically to the user's room if they are connected
        io.to(`org-${organizationId}`).emit('new-notification', notif);
      }

    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Swagger UI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handler (must be last)
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 API available at http://localhost:${PORT}/api`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('\nGracefully shutting down server...');
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error during disconnect:', err);
  }
  
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.once('SIGUSR2', async () => {
  await prisma.$disconnect();
  httpServer.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

export default app;