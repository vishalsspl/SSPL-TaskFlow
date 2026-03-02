// ChatPage.jsx
import { useState, useEffect } from 'react';
import Chat from '@/components/Chat';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, FolderKanban } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

const ChatPage = () => {
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoomState] = useState(null);
    const [loading, setLoading] = useState(true);
    const { unreadCounts, setActiveRoom } = useChatStore();

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await api.get('/chat/rooms');
            setRooms(response.data);
            if (response.data.length > 0) {
                handleRoomSelect(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    // Central handler — updates state, clears badge, updates global store active room
    const handleRoomSelect = (room) => {
        const roomKey = room.isGlobal ? 'global' : room.id;
        setActiveRoomState(room);
        setActiveRoom(roomKey); // This clears unread count in the global store
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <p className="text-muted-foreground Montserrat text-white">Loading channels...</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-muted-foreground Montserrat text-sm">
                        Chat with your team in dedicated project groups
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-6">
                <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 bg-card rounded-xl border border-white/10 p-4 shadow-xl overflow-hidden">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 Montserrat px-2">Channels</h3>
                    <ScrollArea className="flex-1">
                        <div className="space-y-1">
                            {rooms.map((room) => {
                                const roomKey = room.isGlobal ? 'global' : room.id;
                                const count = unreadCounts[roomKey] || 0;

                                return (
                                    <Button
                                        key={room.id}
                                        variant={activeRoom?.id === room.id ? "secondary" : "ghost"}
                                        className={`w-full justify-start Montserrat font-bold rounded-xl h-auto py-3 whitespace-normal ${activeRoom?.id === room.id
                                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                        onClick={() => handleRoomSelect(room)}
                                    >
                                        {room.isGlobal ? (
                                            <Hash className="w-4 h-4 mr-2 shrink-0" />
                                        ) : (
                                            <FolderKanban className="w-4 h-4 mr-2 shrink-0" />
                                        )}
                                        <div className="flex flex-col items-start min-w-0 flex-1">
                                            <div className="flex items-center w-full">
                                                <span className="flex-1 text-left leading-tight py-0.5">{room.name}</span>
                                                {count > 0 && (
                                                    <div className="relative ml-2 shrink-0">
                                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EE2D24] opacity-75"></span>
                                                        <span className="relative min-w-[18px] h-[18px] px-1 bg-[#EE2D24] text-[10px] font-black text-white rounded-full flex items-center justify-center ring-1 ring-[#0A0A0A]">
                                                            {count > 9 ? '9+' : count}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {room.lastMsg && (
                                                <p className="text-[10px] text-gray-500 w-full text-left font-normal mt-0.5 line-clamp-1">
                                                    <span className="font-bold text-gray-400">{room.lastMsg.user.name}: </span>
                                                    {room.lastMsg.content}
                                                </p>
                                            )}
                                        </div>
                                    </Button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                    {activeRoom && (
                        <Chat
                            key={activeRoom.id}
                            projectId={activeRoom.isGlobal ? null : activeRoom.id}
                            title={activeRoom.name}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;