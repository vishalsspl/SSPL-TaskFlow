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
                    <div className="sm:hidden flex items-center justify-between p-3.5 bg-gradient-to-r from-secondary/50 to-card rounded-2xl border border-primary/20 mt-1 cursor-pointer hover:border-primary/40 active:scale-[0.98] transition-all shadow-xl group" onClick={() => setIsListExpanded(true)}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="p-2.5 bg-primary/20 rounded-xl group-hover:bg-primary/30 transition-colors shrink-0">
                                {activeRoom?.isGlobal ? <Hash className="w-4 h-4 text-primary" /> : <FolderKanban className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="min-w-0 flex-1 pr-2">
                                <p className="text-[9px] font-black Montserrat uppercase tracking-widest text-primary/80 mb-0.5">Current Project</p>
                                <p className="font-bold text-[13px] text-foreground Montserrat whitespace-nowrap overflow-hidden text-ellipsis">{activeRoom?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="p-1.5 rounded-full bg-background border border-border shadow-md group-hover:border-primary/50 transition-colors">
                                <ChevronRight className="w-3.5 h-3.5 text-foreground group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Room list — dropdown on mobile, vertical sidebar on sm+ */}
                <div className={`${!isListExpanded ? 'hidden sm:flex' : 'flex absolute inset-x-0 sm:inset-auto top-[64px] sm:top-0 z-50 shadow-2xl sm:shadow-none'} sm:relative sm:w-[320px] flex-shrink-0 flex-col min-h-0 max-h-[65vh] sm:max-h-none overflow-hidden bg-card/95 backdrop-blur-xl sm:bg-card rounded-2xl border border-primary/20 sm:border-border sm:border-y-0 sm:border-r-0 transition-all`}>
                    <ScrollArea className="flex-1 rounded-2xl">
                        <div className="flex flex-col gap-1 p-3 sm:p-4">
                            <div className="flex items-center justify-between px-2 mb-3 sm:hidden">
                                <span className="text-[10px] font-black Montserrat uppercase tracking-widest text-muted-foreground flex items-center gap-2"><FolderKanban className="w-3.5 h-3.5" /> Project Channels</span>
                                <Button variant="ghost" size="icon" onClick={() => setIsListExpanded(false)} className="h-7 w-7 rounded-full bg-secondary/50 hover:bg-secondary"><X className="w-3.5 h-3.5" /></Button>
                            </div>
                            <div className="space-y-1.5">
                                {rooms.map((room) => {
                                    const roomKey = room.isGlobal ? 'global' : room.id;
                                    const count = unreadCounts[roomKey] || 0;

                                    return (
                                        <Button
                                            key={room.id}
                                            variant={activeRoom?.id === room.id ? "secondary" : "ghost"}
                                            className={`w-full justify-start Montserrat font-bold rounded-xl h-auto py-2.5 sm:py-3 px-3.5 transition-all ${activeRoom?.id === room.id
                                                ? 'bg-primary border border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]'
                                                : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary/50'
                                                }`}
                                            onClick={() => handleRoomSelect(room)}
                                        >
                                            {room.isGlobal ? (
                                                <Hash className={`w-4 h-4 mr-3 shrink-0 ${activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-primary/70'}`} />
                                            ) : (
                                                <FolderKanban className={`w-4 h-4 mr-3 shrink-0 ${activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`} />
                                            )}
                                            <div className="flex flex-col items-start min-w-0 flex-1">
                                                <div className="flex items-center w-full min-w-0">
                                                    <span className="flex-1 text-left leading-tight py-0.5 truncate">{room.name}</span>
                                                    {count > 0 && (
                                                        <div className="relative ml-2 shrink-0">
                                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                                                            <span className={`relative min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center ring-1 ring-background ${activeRoom?.id === room.id ? 'bg-background text-primary' : 'bg-red-500 text-white'}`}>
                                                                {count > 9 ? '9+' : count}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {room.lastMsg && (
                                                    <p className={`text-[10px] w-full text-left font-normal mt-1 line-clamp-1 hidden sm:block ${activeRoom?.id === room.id ? 'text-primary-foreground/70' : 'text-gray-500'}`}>
                                                        <span className="font-bold">{room.lastMsg.user.name}: </span>
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