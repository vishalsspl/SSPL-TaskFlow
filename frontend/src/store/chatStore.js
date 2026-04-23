import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '@/lib/api';
import { useNotificationStore } from './notificationStore';
import { useAuthStore } from './authStore';

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
        const user = useAuthStore.getState().user;
        const chatEnabled = user?.organization?.activeFeatures?.chat !== false;
        if (!chatEnabled) {
            console.log('[Chat Store] Chat feature disabled, skipping initial counts.');
            return;
        }
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
        const state = get();
        const orgIdChanged = String(state.organizationId) !== String(organizationId);
        const userIdChanged = String(state.userId) !== String(userId);

        if (orgIdChanged || userIdChanged) {
            console.log(`[Socket] Context update: Org:${state.organizationId}->${organizationId}, User:${state.userId}->${userId}`);
            set({ userId, organizationId });

            // If already connected, we must rejoin rooms with the new organizationId
            if (state.socket && state.isConnected) {
                console.log('[Socket] Organization changed while connected. Rejoining rooms...');
                get().rejoinRooms(api);
            }
        }

        if (get().socket) {
            return;
        }

        const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const socket = io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            extraHeaders: {
                'Bypass-Tunnel-Reminder': 'true'
            }
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
            console.log('[Socket Debug] New notification received:', notification);
            const currentUserId = get().userId;
            console.log(`[Socket Debug] Current UserID: ${currentUserId}, Target UserID: ${notification.userId}`);
            if (String(notification.userId) === String(currentUserId)) {
                console.log('[Socket Debug] User matched! Adding notification to store.');
                useNotificationStore.getState().addNotification(notification);
            }
        });

        // When Super Admin updates org plan/features, refresh user permissions immediately.
        socket.on('org-permissions-updated', async (payload) => {
            try {
                const state = get();
                if (!state.organizationId) return;
                if (String(payload?.organizationId) !== String(state.organizationId)) return;

                console.log('[Socket] org-permissions-updated received. Re-syncing /auth/me...');
                await useAuthStore.getState().syncUser(api);
            } catch (err) {
                console.error('[Socket] Failed to re-sync permissions after org update:', err);
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

        const user = useAuthStore.getState().user;
        const chatEnabled = user?.organization?.activeFeatures?.chat !== false;

        console.log('Rejoining all rooms...');
        if (chatEnabled) {
            joinRoom('global');
        }

        if (!chatEnabled) {
            console.log('[Chat Store] Chat feature disabled, skipping room rejoins.');
            return;
        }

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
