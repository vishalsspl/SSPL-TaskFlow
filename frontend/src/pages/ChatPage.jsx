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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, Plus, MessageSquare } from 'lucide-react';

const ChatPage = () => {
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoomState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isListExpanded, setIsListExpanded] = useState(false);
    const [activeList, setActiveList] = useState('channels'); // 'channels' or 'dms'
    const { unreadCounts, setActiveRoom } = useChatStore();
    const { user } = useAuthStore();

    // New DM state
    const [isAddDMOpen, setIsAddDMOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const { setHeader } = useHeaderStore();

    useEffect(() => {
        setHeader("Chat", "Chat with your team in dedicated project groups");
        fetchRooms();
    }, [setHeader]);

    const fetchRooms = async () => {
        try {
            const response = await api.get('/chat/rooms');
            
            // Ensure response.data is an array
            const roomList = Array.isArray(response.data) ? response.data : [];

            // Decrypt last message previews for all rooms in parallel
            const decryptedRooms = await Promise.all(roomList.map(async (room) => {
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

    const fetchAvailableUsers = async () => {
        setIsSearching(true);
        try {
            const response = await api.get('/users?orgMembersOnly=true');
            setAvailableUsers(response.data.filter(u => u.id !== user.id && u.role !== 'CLIENT' && u.role !== 'ADMIN'));
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (isAddDMOpen) {
            fetchAvailableUsers();
        }
    }, [isAddDMOpen]);

    const startDM = (otherUser) => {
        // Sort IDs to ensure consistency if needed, but the backend allows any order `dm_id1_id2`
        // We'll just generate one format
        const dmId = `dm_${user.id}_${otherUser.id}`;
        const existing = rooms.find(r => r.id === dmId || r.id === `dm_${otherUser.id}_${user.id}`);
        
        if (existing) {
            handleRoomSelect(existing);
        } else {
            const newRoom = {
                id: dmId,
                name: otherUser.name,
                isGlobal: false,
                isDM: true,
                lastMsg: null,
                unreadCount: 0
            };
            setRooms([newRoom, ...rooms]);
            handleRoomSelect(newRoom);
        }
        setIsAddDMOpen(false);
    };

    const filteredUsers = availableUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    );

    const channels = rooms.filter(r => !r.isDM);
    const dms = rooms.filter(r => r.isDM);

    const channelsUnread = channels.reduce((acc, room) => acc + (unreadCounts[room.isGlobal ? 'global' : room.id] || 0), 0);
    const dmsUnread = dms.reduce((acc, room) => acc + (unreadCounts[room.id] || 0), 0);

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
                    <ScrollArea className="flex-1 rounded-2xl w-full">
                        <div className="flex flex-col gap-1 p-3 sm:p-4 w-full overflow-hidden box-border">
                            <div className="flex items-center justify-between px-2 mb-3 sm:hidden">
                                <span className="text-[10px] font-black Montserrat uppercase tracking-widest text-muted-foreground flex items-center gap-2"><FolderKanban className="w-3.5 h-3.5" /> Project Channels</span>
                                <Button variant="ghost" size="icon" onClick={() => setIsListExpanded(false)} className="h-7 w-7 rounded-full bg-secondary/50 hover:bg-secondary"><X className="w-3.5 h-3.5" /></Button>
                            </div>

                            {/* TABS */}
                            <div className="flex bg-secondary/30 p-1 rounded-xl mb-4 mt-1">
                                <Button
                                    variant="ghost"
                                    className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] uppercase font-black tracking-widest transition-all rounded-lg ${activeList === 'channels' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                                    onClick={() => setActiveList('channels')}
                                >
                                    Channels
                                    {channelsUnread > 0 && (
                                        <span className="flex items-center justify-center bg-red-500 text-white rounded-full min-w-[14px] h-[14px] px-0.5 text-[8px] font-bold shadow-sm">
                                            {channelsUnread > 99 ? '99+' : channelsUnread}
                                        </span>
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] uppercase font-black tracking-widest transition-all rounded-lg ${activeList === 'dms' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                                    onClick={() => setActiveList('dms')}
                                >
                                    Direct Msgs
                                    {dmsUnread > 0 && (
                                        <span className="flex items-center justify-center bg-red-500 text-white rounded-full min-w-[14px] h-[14px] px-0.5 text-[8px] font-bold shadow-sm">
                                            {dmsUnread > 99 ? '99+' : dmsUnread}
                                        </span>
                                    )}
                                </Button>
                            </div>

                            {/* PROJECT CHANNELS */}
                            {activeList === 'channels' && (
                                <div className="space-y-1.5 mb-4">
                                    {channels.map((room) => {
                                        const roomKey = room.isGlobal ? 'global' : room.id;
                                        const count = unreadCounts[roomKey] || 0;

                                        return (
                                            <Button
                                                key={room.id}
                                                variant={activeRoom?.id === room.id ? "secondary" : "ghost"}
                                                className={`group w-full !grid !grid-cols-[auto_minmax(0,1fr)] gap-3 items-center text-left Montserrat font-bold rounded-xl h-auto py-2.5 sm:py-3 px-3.5 transition-all ${activeRoom?.id === room.id
                                                    ? 'bg-primary border border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:bg-primary/90 hover:text-primary-foreground'
                                                    : 'text-muted-foreground border border-transparent hover:text-primary hover:bg-primary/10'
                                                    }`}
                                                onClick={() => handleRoomSelect(room)}
                                            >
                                                {room.isGlobal ? (
                                                    <Hash className={`w-4 h-4 shrink-0 ${activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-primary/70'}`} />
                                                ) : (
                                                    <FolderKanban className={`w-4 h-4 shrink-0 ${activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`} />
                                                )}
                                                <div className="flex flex-col min-w-0 w-full overflow-hidden">
                                                    <div className="flex items-center w-full min-w-0">
                                                        <span className="flex-1 text-left leading-tight py-0.5 truncate">{room.name || 'Unnamed Channel'}</span>
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
                                                        <p className={`text-[10px] w-full text-left font-normal mt-1 truncate hidden sm:block ${activeRoom?.id === room.id ? 'text-primary-foreground/70' : 'text-gray-500 group-hover:text-primary/70'}`}>
                                                            <span className="font-bold">{room.lastMsg.user?.name}: </span>
                                                            {room.lastMsg.content}
                                                        </p>
                                                    )}
                                                </div>
                                            </Button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* DIRECT MESSAGES */}
                            {activeList === 'dms' && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between mb-3 px-2">
                                        <span className="text-[10px] font-black Montserrat uppercase tracking-widest text-muted-foreground">Private Chats</span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsAddDMOpen(true)}
                                            className="h-6 px-2 text-[9px] uppercase font-black tracking-widest text-primary hover:bg-primary/10 rounded"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> New DM
                                        </Button>
                                    </div>
                                    
                                    {dms.length === 0 ? (
                                        <div className="text-center py-6">
                                            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-xs text-muted-foreground Montserrat">No direct messages yet.</p>
                                            <p className="text-[10px] text-muted-foreground/70 Montserrat mt-1">Click 'New DM' to start chatting.</p>
                                        </div>
                                    ) : (
                                        dms.map((room) => {
                                            const count = unreadCounts[room.id] || 0;

                                            return (
                                                <Button
                                                    key={room.id}
                                                    variant={activeRoom?.id === room.id ? "secondary" : "ghost"}
                                                    className={`group w-full !grid !grid-cols-[auto_minmax(0,1fr)] gap-3 items-center text-left Montserrat font-bold rounded-xl h-auto py-2.5 sm:py-3 px-3.5 transition-all ${activeRoom?.id === room.id
                                                        ? 'bg-primary border border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:bg-primary/90 hover:text-primary-foreground'
                                                        : 'text-muted-foreground border border-transparent hover:text-primary hover:bg-primary/10'
                                                        }`}
                                                    onClick={() => handleRoomSelect(room)}
                                                >
                                                    <Avatar className={`w-6 h-6 shrink-0 ring-2 ${activeRoom?.id === room.id ? 'ring-primary-foreground/50' : 'ring-primary/20'}`}>
                                                        <AvatarFallback className={`${activeRoom?.id === room.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'} text-[10px]`}>
                                                            {room.name ? room.name.charAt(0).toUpperCase() : '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0 w-full overflow-hidden">
                                                        <div className="flex items-center w-full min-w-0">
                                                            <span className="flex-1 text-left leading-tight py-0.5 truncate">{room.name || 'Unknown User'}</span>
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
                                                            <p className={`text-[10px] w-full text-left font-normal mt-1 truncate hidden sm:block ${activeRoom?.id === room.id ? 'text-primary-foreground/70' : 'text-gray-500 group-hover:text-primary/70'}`}>
                                                                <span className="font-bold">{room.lastMsg.user?.name}: </span>
                                                                {room.lastMsg.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                </Button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
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

            {/* Add DM Dialog */}
            <Dialog open={isAddDMOpen} onOpenChange={setIsAddDMOpen}>
                <DialogContent className="bg-background border-border text-foreground Montserrat w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black Montserrat">New Direct Message</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                                placeholder="Search users by name or email..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="pl-10 bg-secondary border-border focus-visible:ring-primary"
                            />
                        </div>

                        <ScrollArea className="h-64 pr-4">
                            {isSearching ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-8">No users found</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredUsers.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer" onClick={() => startDM(u)}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={u.avatar} />
                                                    <AvatarFallback className="bg-white/10 text-xs">
                                                        {u.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-bold truncate max-w-[150px]">{u.name}</p>
                                                    <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{u.email}</p>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" className="h-8 border-white/10 hover:bg-primary hover:text-white hover:border-primary transition-all Montserrat">
                                                <MessageSquare className="w-3 h-3 mr-1" /> Message
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ChatPage;