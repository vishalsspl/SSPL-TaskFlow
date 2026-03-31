import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '@/lib/api';
import { useNotificationStore } from './notificationStore';

export const useChatStore = create((set, get) => ({
    socket: null,
    userId: null,
    organizationId: null,
    isConnected: false,
    unreadCounts: {}, // { roomId: count }
    totalUnread: 0,
    activeRoomId: null,

    // NEW: Fetch initial unread counts from server
    fetchInitialUnread: async () => {
        try {
            console.log('[Chat Store] Fetching initial unread counts...');
            const response = await api.get('/chat/rooms');
            const counts = {};
            response.data.forEach(room => {
                counts[room.id] = room.unreadCount || 0;
            });
            const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
            console.log('[Chat Store] Initial counts loaded:', counts, 'Total:', total);
            set({ unreadCounts: counts, totalUnread: total });
        } catch (error) {
            console.error('[Chat Store] Failed to fetch initial unread counts:', error);
        }
    },

    initSocket: (userId, organizationId) => {
        console.log('initSocket called with:', { userId, organizationId });
        set({ userId, organizationId });
        if (get().socket) {
            console.log('Socket already exists, skipping initialization');
            return;
        }

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        });

        socket.on('connect', () => {
            console.log('Chat socket connected:', socket.id);
            set({ isConnected: true });
            
            // Re-join existing rooms if it was a reconnection
            const state = get();
            if (state.activeRoomId) {
                get().joinRoom(state.activeRoomId);
            }
        });

        socket.on('disconnect', () => {
            console.log('Chat socket disconnected');
            set({ isConnected: false });
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            set({ isConnected: false });
        });

        // Global notification listener for all connected users
        socket.on('message-notification', (data) => {
            const { roomId, senderId } = data;
            const state = get();
            const currentActiveRoom = state.activeRoomId;
            const currentUserId = state.userId;

            console.log(`[Chat Notification] Room:${roomId}, Sender:${senderId}, CurrentUser:${currentUserId}, ActiveRoom:${currentActiveRoom}`);

            const isDifferentUser = String(senderId) !== String(currentUserId);
            const isDifferentRoom = String(roomId) !== String(currentActiveRoom);

            if (isDifferentUser && isDifferentRoom) {
                console.log(`[Chat Notification] Incrementing unread count for room: ${roomId}`);
                set((state) => {
                    const newCounts = { ...state.unreadCounts };
                    newCounts[roomId] = (Number(newCounts[roomId]) || 0) + 1;
                    const newTotal = Object.values(newCounts).reduce((a, b) => a + (Number(b) || 0), 0);
                    console.log(`[Chat Notification] Updated Counts:`, newCounts, `Total:`, newTotal);
                    return { unreadCounts: newCounts, totalUnread: newTotal };
                });
            } else {
                console.log(`[Chat Notification] Skip: isDifferentUser=${isDifferentUser}, isDifferentRoom=${isDifferentRoom}`);
            }
        });

        socket.on('new-message', (message) => {
            const roomId = message.projectId || 'global';
            const currentActiveRoom = get().activeRoomId;

            if (currentActiveRoom === roomId) {
                get().clearUnread(roomId);
            }
        });

        socket.on('new-notification', (notification) => {
            console.log('[Socket] New notification received:', notification);
            const currentUserId = get().userId;
            if (String(notification.userId) === String(currentUserId)) {
                useNotificationStore.getState().addNotification(notification);
            }
        });

        set({ socket });

        // Also fetch initial counts immediately
        get().fetchInitialUnread();
    },

    joinRoom: (roomId) => {
        const { socket, organizationId } = get();
        if (socket) {
            console.log(`Emitting join-room for: ${roomId} with org: ${organizationId}`);
            socket.emit('join-room', { roomId, organizationId });
        }
    },

    rejoinRooms: async (apiInstance) => {
        const { socket, joinRoom, organizationId } = get();
        if (!socket) return;

        console.log('Rejoining all rooms...');
        joinRoom('global');

        try {
            const response = await apiInstance.get('/chat/rooms');
            response.data.forEach(room => {
                if (!room.isGlobal) {
                    joinRoom(room.id);
                }
            });
        } catch (error) {
            console.error('Failed to fetch rooms for rejoining:', error);
        }
    },

    setActiveRoom: (roomId) => {
        console.log(`Setting active room to: ${roomId}`);
        set({ activeRoomId: roomId });
        if (roomId) {
            get().clearUnread(roomId);
        }
    },

    clearUnread: (roomId) => {
        set((state) => {
            const newCounts = { ...state.unreadCounts };
            if (roomId) {
                newCounts[roomId] = 0;
            }
            const newTotal = Object.values(newCounts).reduce((a, b) => a + (Number(b) || 0), 0);
            return { unreadCounts: newCounts, totalUnread: newTotal };
        });
    },

    disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false });
        }
    },
}));
