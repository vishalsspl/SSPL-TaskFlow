// ChatPage.jsx
import { useState, useEffect } from 'react';
import Chat from '@/components/Chat';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, FolderKanban, ChevronRight, X } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { decrypt } from '@/lib/encryption';

const ChatPage = () => {
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoomState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isListExpanded, setIsListExpanded] = useState(false);
    const { unreadCounts, setActiveRoom } = useChatStore();
    const { setHeader } = useHeaderStore();

    useEffect(() => {
        setHeader("Chat", "Chat with your team in dedicated project groups");
        fetchRooms();
    }, [setHeader]);

    const fetchRooms = async () => {
        try {
            const response = await api.get('/chat/rooms');
            // Decrypt last message previews for all rooms in parallel
            const decryptedRooms = await Promise.all(response.data.map(async (room) => {
                if (room.lastMsg && room.lastMsg.content) {
                    return {
                        ...room,
                        lastMsg: {
                            ...room.lastMsg,
                            content: await decrypt(room.lastMsg.content)
                        }
                    };
                }
                return room;
            }));

            setRooms(decryptedRooms);
            if (decryptedRooms.length > 0) {
                handleRoomSelect(decryptedRooms[0]);
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
        setIsListExpanded(false); // Auto-collapse on mobile
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <p className="text-muted-foreground Montserrat">Loading channels...</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-8rem)] flex flex-col gap-3 sm:gap-6">

            <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-3 sm:gap-6 overflow-hidden relative">
                {/* Mobile Collapsed Header */}
                {!isListExpanded && (
                    <div className="sm:hidden flex items-center justify-between p-3 bg-card rounded-xl border border-border mt-1 cursor-pointer active:scale-[0.98] transition-all shadow-lg" onClick={() => setIsListExpanded(true)}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                {activeRoom?.isGlobal ? <Hash className="w-4 h-4 text-primary" /> : <FolderKanban className="w-4 h-4 text-primary" />}
                            </div>
                            <div>
                                <p className="text-xs font-black Montserrat uppercase tracking-widest text-primary/70">Current Channel</p>
                                <p className="font-bold text-foreground Montserrat">{activeRoom?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black Montserrat uppercase text-muted-foreground">Switch Project</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>
                )}

                {/* Room list — collapsible on mobile, vertical sidebar on sm+ */}
                <div className={`${!isListExpanded ? 'hidden sm:flex' : 'flex'} sm:w-[300px] flex-shrink-0 flex flex-col min-h-0 max-h-[40vh] sm:max-h-none overflow-hidden sm:overflow-visible z-20`}>
                    <ScrollArea className="flex-1 bg-card rounded-xl border border-border shadow-xl">
                        <div className="flex flex-col gap-1 p-2 sm:p-4">
                            <div className="flex items-center justify-between px-2 mb-2 sm:hidden">
                                <span className="text-xs font-black Montserrat uppercase tracking-widest text-muted-foreground">Select Project</span>
                                <Button variant="ghost" size="sm" onClick={() => setIsListExpanded(false)} className="h-6 text-[10px] font-black">CLOSE</Button>
                            </div>
                            <div className="space-y-1">
                                {rooms.map((room) => {
                                    const roomKey = room.isGlobal ? 'global' : room.id;
                                    const count = unreadCounts[roomKey] || 0;

                                    return (
                                        <Button
                                            key={room.id}
                                            variant={activeRoom?.id === room.id ? "secondary" : "ghost"}
                                            className={`w-full justify-start Montserrat font-bold rounded-xl h-auto py-2 sm:py-3 px-3 ${activeRoom?.id === room.id
                                                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
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
                                                            <span className="relative min-w-[18px] h-[18px] px-1 bg-[#EE2D24] text-[10px] font-black text-white rounded-full flex items-center justify-center ring-1 ring-background">
                                                                {count > 9 ? '9+' : count}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {room.lastMsg && (
                                                    <p className="text-[10px] text-gray-500 w-full text-left font-normal mt-0.5 line-clamp-1 hidden sm:block">
                                                        <span className="font-bold text-gray-400">{room.lastMsg.user.name}: </span>
                                                        {room.lastMsg.content}
                                                    </p>
                                                )}
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
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