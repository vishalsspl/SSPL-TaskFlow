import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
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
import paymentRoutes from './routes/payment.js';
import integrationRoutes from './routes/integrations.js';
import uploadRoutes from './routes/upload.js';
import documentRoutes from './routes/documentRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import { getPublicSettings } from './controllers/settingsController.js';
import { errorHandler } from './middleware/errorHandler.js';
import path from 'path';
import prisma from './lib/prisma.js';
import tenantDbManager from './lib/tenantDbManager.js';
import { attachIo } from './middleware/socketMiddleware.js';
import { initCronJobs } from './utils/cronJobs.js';


// dotenv.config(); is now handled by the import above


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
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
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
app.use('/api/billing', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/roles', roleRoutes);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
        const { content, userId, projectId, organizationId, snippet, replyToId, mentionedUserIds } = data;
        console.log(`[Socket] New message from User ${userId} in Room ${projectId || 'global'} (ReplyTo: ${replyToId || 'none'})`);
        
        try {
            if (!organizationId) {
                console.warn(`[Socket] Message blocked: No organizationId provided.`);
                return;
            }

            const org = await prisma.organization.findUnique({
                where: { id: organizationId },
                select: { dbUrl: true, dbStrategy: true }
            });

            if (!org) {
                console.warn(`[Socket] Message blocked: Org ${organizationId} not found.`);
                return;
            }

            let tenantDb = prisma;
            if (org.dbUrl && org.dbStrategy === 'DEDICATED') {
                tenantDb = await tenantDbManager.getClient(org.dbUrl);
            }

            const message = await tenantDb.chatMessage.create({
                data: {
                    content,
                    userId,
                    projectId: projectId || null,
                    organizationId,
                    parentId: replyToId || null,
                    isForwarded: data.isForwarded || false
                },
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                    parent: {
                        include: {
                            user: { select: { id: true, name: true } }
                        }
                    }
                },
            });

            console.log(`[Socket] Message saved: ${message.id}`);

            const targetRoom = projectId || `global-${organizationId}`;
            io.to(targetRoom).emit('new-message', message);
            console.log(`[Socket] Message broadcasted to room: ${targetRoom}`);

      // 4. Create persistent Notifications in bulk (in tenant DB)
      const isDM = projectId && projectId.startsWith('dm_');
      const project = (projectId && !isDM) ? await tenantDb.project.findUnique({
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
            room: isDM ? 'direct_message' : (projectId ? 'project' : 'global'),
            projectName: isDM ? 'Direct Message' : (projectId ? (project?.name || 'Unknown') : 'General Channel'),
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
      if (isDM) {
        const ids = projectId.replace('dm_', '').split('_');
        targetUserIds = ids.filter(id => id !== userId);
      } else if (projectId && project) {
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

      let finalTargets = [...new Set(targetUserIds)].filter(id => id !== userId);

      // If this is a group chat and mentions are used, restrict notifications to mentioned users
      if (!isDM && Array.isArray(mentionedUserIds) && mentionedUserIds.length > 0) {
          finalTargets = finalTargets.filter(id => mentionedUserIds.includes(id));
      }

      for (const targetId of finalTargets) {
        const notif = await tenantDb.notification.create({
          data: {
            userId: targetId,
            organizationId,
            type: 'CHAT_MESSAGE',
            title: isDM ? 'Direct Message' : (projectId ? `Message in ${project.name}` : 'General Message'),
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
    const { messageId, organizationId, projectId, userId, userRole } = data;
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
        if (userRole !== 'ADMIN' && messageToDelete.userId !== userId) {
            console.warn(`User ${userId} attempted to delete message ${messageId} without permission.`);
            return;
        }
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

  socket.on('react-message', async (data) => {
    const { messageId, emoji, userId, organizationId, projectId } = data;
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { dbUrl: true, dbStrategy: true }
      });

      let tenantDb = prisma;
      if (org?.dbUrl && org?.dbStrategy === 'DEDICATED') {
        tenantDb = await tenantDbManager.getClient(org.dbUrl);
      }

      const msg = await tenantDb.chatMessage.findUnique({ where: { id: messageId } });
      if (!msg) return;

      const currentReactions = msg.reactions || {};
      const userIds = currentReactions[emoji] || [];
      
      let updatedUserIds;
      if (userIds.includes(userId)) {
        updatedUserIds = userIds.filter(id => id !== userId);
      } else {
        updatedUserIds = [...userIds, userId];
      }

      const updatedReactions = {
        ...currentReactions,
        [emoji]: updatedUserIds
      };

      // Remove emoji key if no users left
      if (updatedUserIds.length === 0) {
        delete updatedReactions[emoji];
      }

      await tenantDb.chatMessage.update({
        where: { id: messageId },
        data: { reactions: updatedReactions }
      });

      const targetRoom = projectId || `global-${organizationId}`;
      io.to(targetRoom).emit('message-reacted', { messageId, reactions: updatedReactions });
    } catch (error) {
      console.error('Error reacting to message:', error);
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

// Initialize scheduled tasks
initCronJobs();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 API available at http://localhost:${PORT}/api`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('\nGracefully shutting down server...');
  
  // Force exit after 1 second if graceful shutdown hangs
  const forceExit = setTimeout(() => {
    console.log('Forcefully shutting down...');
    process.exit(1);
  }, 1000);
  forceExit.unref();

  try {
    await prisma.$disconnect();
    await tenantDbManager.shutdown();
    console.log('Database connections closed.');
  } catch (err) {
    console.error('Error during disconnect:', err);
  }

  httpServer.close(() => {
    clearTimeout(forceExit);
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle Nodemon restarts (Windows compatible)
process.once('SIGUSR2', () => {
  console.log('Nodemon restart detected. Exiting...');
  process.exit(0);
});




export default app;
// Force iisnode restart