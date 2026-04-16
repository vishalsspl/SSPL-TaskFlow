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
import tenantDbManager from './lib/tenantDbManager.js';
import { attachIo } from './middleware/socketMiddleware.js';


dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  process.env.CLIENT_URL
].filter(origin => origin);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'bypass-tunnel-reminder']
};

const io = new Server(httpServer, {
  cors: corsOptions
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors(corsOptions));
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
      // 1. Resolve organization for DB connection
      if (!organizationId) {
        console.warn(`[Socket] Message from User ${userId} blocked: No organizationId provided.`);
        return;
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { dbUrl: true, dbStrategy: true }
      });

      if (!org) {
        console.warn(`[Socket] Message blocked: Organization ${organizationId} not found in Main DB.`);
        return;
      }

      // 2. Get the correct tenant DB client
      let tenantDb = prisma;
      if (org.dbUrl && org.dbStrategy === 'DEDICATED') {
        tenantDb = await tenantDbManager.getClient(org.dbUrl);
      }

      // 3. Save message in tenant DB
      const message = await tenantDb.chatMessage.create({
        data: {
          content,
          userId,
          projectId: projectId || null,
          organizationId
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      const targetRoom = projectId || `global-${organizationId}`;

      // Deliver message to users IN the room
      io.to(targetRoom).emit('new-message', message);

      // 4. Create persistent Notifications in bulk (in tenant DB)
      const project = projectId ? await tenantDb.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: { include: { assignees: true } },
          manager: true,
          client: true,
          workloads: true
        }
      }) : null;

      // ✅ NEW: Log this action for global audit
      try {
        const logData = {
          userId,
          organizationId,
          projectId: projectId || null,
          action: 'MESSAGE_SENT',
          entity: 'chat',
          entityId: message.id,
          details: {
            room: projectId ? 'project' : 'global',
            projectName: projectId ? (project?.name || 'Unknown') : 'General Channel',
            snippet: snippet || 'encrypted message'
          }
        };

        // 1. Log to tenant DB
        await tenantDb.activityLog.create({ data: logData });

        // 2. Log to main DB for SuperAdmin visibility
        await prisma.activityLog.create({ data: logData });
      } catch (logErr) {
        console.error('[Socket Message] Failed to log activity:', logErr.message);
      }

      // Broadcast lightweight notification
      const notificationChannel = organizationId ? io.to(`org-${organizationId}`) : io;

      notificationChannel.emit('message-notification', {
        roomId: projectId || 'global',
        senderId: userId,
        content: message.content,
        senderName: message.user.name,
      });

      let targetUserIds = [];
      if (projectId && project) {
        const assignees = new Set();
        project.tasks.forEach(t => t.assignees.forEach(a => assignees.add(a.userId)));
        targetUserIds = Array.from(assignees);
        if (project.managerId) targetUserIds.push(project.managerId);
        if (project.clientId) targetUserIds.push(project.clientId);
      } else {
        const orgUsers = await tenantDb.user.findMany({
          where: { organizationId },
          select: { id: true }
        });
        targetUserIds = orgUsers.map(u => u.id);
      }

      const finalTargets = [...new Set(targetUserIds)].filter(id => id !== userId);

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
        io.to(`org-${organizationId}`).emit('new-notification', notif);
      }

    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('edit-message', async (data) => {
    const { messageId, content, organizationId, projectId } = data;
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { dbUrl: true, dbStrategy: true }
      });

      let tenantDb = prisma;
      if (org?.dbUrl && org?.dbStrategy === 'DEDICATED') {
        tenantDb = await tenantDbManager.getClient(org.dbUrl);
      }

      const updatedMessage = await tenantDb.chatMessage.update({
        where: { id: messageId },
        data: { content, isEdited: true },
        include: { user: { select: { id: true, name: true, avatar: true } } }
      });

      // ✅ Log Edit Action
      try {
        await tenantDb.activityLog.create({
          data: {
            userId: updatedMessage.userId,
            organizationId,
            projectId: projectId || null,
            action: 'MESSAGE_EDITED',
            entity: 'chat',
            entityId: messageId,
            details: {
              room: projectId ? 'project' : 'global',
              snippet: data.snippet || 'message updated'
            }
          }
        });
      } catch (logErr) {
        console.error('[Socket Edit] Failed to log activity:', logErr.message);
      }

      const targetRoom = projectId || `global-${organizationId}`;
      io.to(targetRoom).emit('message-updated', updatedMessage);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  });

  socket.on('delete-message', async (data) => {
    const { messageId, organizationId, projectId } = data;
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { dbUrl: true, dbStrategy: true }
      });

      let tenantDb = prisma;
      if (org?.dbUrl && org?.dbStrategy === 'DEDICATED') {
        tenantDb = await tenantDbManager.getClient(org.dbUrl);
      }

      const messageToDelete = await tenantDb.chatMessage.findUnique({
        where: { id: messageId },
        include: { user: { select: { name: true } } }
      });

      if (messageToDelete) {
        // ✅ Log Delete Action
        try {
          await tenantDb.activityLog.create({
            data: {
              userId: messageToDelete.userId,
              organizationId,
              projectId: projectId || null,
              action: 'MESSAGE_DELETED',
              entity: 'chat',
              entityId: messageId,
              details: {
                room: projectId ? 'project' : 'global',
                sender: messageToDelete.user.name
              }
            }
          });
        } catch (logErr) {
          console.error('[Socket Delete] Failed to log activity:', logErr.message);
        }

        await tenantDb.chatMessage.delete({
          where: { id: messageId }
        });
      }

      const targetRoom = projectId || `global-${organizationId}`;
      io.to(targetRoom).emit('message-deleted', { messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), tenantPoolSize: tenantDbManager.getPoolSize() });
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
    await tenantDbManager.shutdown();
    console.log('Database connections closed.');
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
  await tenantDbManager.shutdown();
  httpServer.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

export default app;