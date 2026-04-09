import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import api from '@/lib/api';
import { encrypt, decrypt } from '@/lib/encryption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User, UserPlus, Search, Loader2, ChevronLeft, Pencil, Trash2, Check, X } from 'lucide-react';
import { formatChatTimestamp } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const Chat = ({ projectId = null, title = "General Chat", onBack = null }) => {
    const { toast } = useToast();
    const { user } = useAuthStore();
    const { socket, setActiveRoom, joinRoom } = useChatStore();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Add member state
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [invitingId, setInvitingId] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);

    // Edit/Delete state
    const [editingMsgId, setEditingMsgId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const roomId = projectId || `global-${user.organizationId}`;

        // Join room and set as active
        joinRoom(roomId);
        setActiveRoom(roomId);

        // Fetch history
        const fetchHistory = async () => {
            try {
                const response = await api.get(`/chat/history${projectId ? `?projectId=${projectId}` : ''}`);
                // Decrypt all historical messages in parallel
                const decryptedHistory = await Promise.all(response.data.map(async (msg) => ({
                    ...msg,
                    content: await decrypt(msg.content)
                })));
                setMessages(decryptedHistory);
            } catch (error) {
                console.error('Failed to fetch chat history:', error);
            }
        };

        fetchHistory();

        // Listen for new messages
        if (socket) {
            const handleNewMessage = async (message) => {
                const msgRoomId = message.projectId || `global-${message.organizationId}`;
                if (msgRoomId === roomId) {
                    // Decrypt new incoming message
                    const decryptedMessage = {
                        ...message,
                        content: await decrypt(message.content)
                    };
                    setMessages((prev) => [...prev, decryptedMessage]);
                }
            };

            socket.on('new-message', handleNewMessage);

            socket.on('message-updated', async (updatedMsg) => {
                const msgRoomId = updatedMsg.projectId || `global-${updatedMsg.organizationId}`;
                if (msgRoomId === roomId) {
                    const decryptedContent = await decrypt(updatedMsg.content);
                    setMessages((prev) => prev.map(m => m.id === updatedMsg.id ? { ...updatedMsg, content: decryptedContent } : m));
                }
            });

            socket.on('message-deleted', ({ messageId }) => {
                setMessages((prev) => prev.filter(m => m.id !== messageId));
            });

            return () => {
                socket.off('new-message');
                socket.off('message-updated');
                socket.off('message-deleted');
                setActiveRoom(null);
            };
        }

        return () => {
            setActiveRoom(null);
        };
    }, [projectId, socket, joinRoom, setActiveRoom]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (addMemberOpen) {
            fetchAvailableUsers();
            if (projectId) {
                fetchProjectMembers();
            }
        }
    }, [addMemberOpen, projectId]);

    const fetchProjectMembers = async () => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            // Extract user IDs from workloads
            const memberIds = (response.data.workloads || []).map(w => w.userId);
            setProjectMembers(memberIds);
        } catch (error) {
            console.error('Failed to fetch project members:', error);
        }
    };

    const fetchAvailableUsers = async () => {
        setIsSearching(true);
        try {
            const response = await api.get('/users?teamOnly=true');
            setAvailableUsers(response.data.filter(u => u.role !== 'CLIENT'));
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleInvite = async (userId) => {
        setInvitingId(userId);
        try {
            await api.post(`/projects/${projectId}/members`, { userId });
            setProjectMembers(prev => [...prev, userId]); // Update local state
            toast({
                title: 'Success',
                description: 'Member added successfully',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.error || 'Failed to add member',
            });
        } finally {
            setInvitingId(null);
        }
    };

    const handleRemoveMember = async (userId) => {
        try {
            await api.delete(`/projects/${projectId}/members/${userId}`);
            setProjectMembers(prev => prev.filter(id => id !== userId));
            toast({
                title: 'Success',
                description: 'Member removed successfully',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.error || 'Failed to remove member',
            });
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const encryptedContent = await encrypt(newMessage);

        socket.emit('send-message', {
            content: encryptedContent,
            userId: user.id,
            projectId: projectId,
            organizationId: user.organizationId,
            snippet: newMessage.substring(0, 100)
        });

        setNewMessage('');
    };

    const handleUpdateMessage = async (e) => {
        e.preventDefault();
        if (!editContent.trim() || !socket || !editingMsgId) return;

        const encryptedContent = await encrypt(editContent);
        socket.emit('edit-message', {
            messageId: editingMsgId,
            content: encryptedContent,
            projectId,
            organizationId: user.organizationId,
            snippet: editContent.substring(0, 100)
        });

        setEditingMsgId(null);
        setEditContent('');
    };

    const handleDeleteMessage = (messageId) => {
        if (!window.confirm('Are you sure you want to delete this message?')) return;
        if (!socket) return;

        socket.emit('delete-message', {
            messageId,
            projectId,
            organizationId: user.organizationId
        });
    };

    const filteredUsers = availableUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    );

    const isManagerOrAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';

    return (
        <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg shrink-0 px-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-xs font-bold Montserrat">Back</span>
                        </Button>
                    )}
                    <h3 className="font-bold text-lg Montserrat text-foreground truncate">{title}</h3>
                </div>
                {isManagerOrAdmin && projectId && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAddMemberOpen(true)}
                        className="text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
                    >
                        <UserPlus className="w-5 h-5" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Send className="w-7 h-7 text-primary opacity-60" />
                            </div>
                            <h4 className="text-lg font-bold text-foreground Montserrat mb-1">No messages yet</h4>
                            <p className="text-sm text-muted-foreground Montserrat max-w-xs">
                                Be the first to start the conversation! Type a message below to get things going.
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.userId === user.id ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <Avatar className="w-8 h-8 shrink-0">
                                    <AvatarImage src={msg.user?.avatar} />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        {msg.user?.name?.charAt(0) || <User className="w-4 h-4" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`flex flex-col max-w-[80%] group ${msg.userId === user.id ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-gray-400 Montserrat">{msg.user?.name}</span>
                                        <span className="text-[10px] text-gray-500 Montserrat">
                                            {formatChatTimestamp(msg.createdAt)}
                                            {msg.isEdited && <span className="ml-1 opacity-70">(edited)</span>}
                                        </span>
                                        
                                        {/* Action Buttons */}
                                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 ${msg.userId === user.id ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {msg.userId === user.id && (
                                                <button 
                                                    onClick={() => {
                                                        setEditingMsgId(msg.id);
                                                        setEditContent(msg.content);
                                                    }}
                                                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-primary"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            )}
                                            {(msg.userId === user.id || isManagerOrAdmin) && (
                                                <button 
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {editingMsgId === msg.id ? (
                                        <div className="flex flex-col gap-2 w-full min-w-[200px]">
                                            <Input
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="bg-background border-primary/50 text-sm h-9 Montserrat"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleUpdateMessage(e);
                                                    if (e.key === 'Escape') setEditingMsgId(null);
                                                }}
                                            />
                                            <div className="flex items-center gap-2 justify-end">
                                                <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase font-bold" onClick={() => setEditingMsgId(null)}>
                                                    <X className="w-3 h-3 mr-1" /> Cancel
                                                </Button>
                                                <Button size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={handleUpdateMessage}>
                                                    <Check className="w-3 h-3 mr-1" /> Save
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className={`p-3 rounded-2xl text-sm Montserrat ${msg.userId === user.id
                                                ? 'bg-primary text-primary-foreground rounded-tr-none shadow-lg'
                                                : 'bg-secondary/50 text-foreground rounded-tl-none'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 bg-secondary/20 border-t border-border flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="bg-background border-border text-foreground Montserrat focus-visible:ring-primary h-11"
                />
                <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground h-11 w-11">
                    <Send className="w-4 h-4" />
                </Button>
            </form>

            {/* Add Member Dialog */}
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogContent className="bg-background border-border text-foreground Montserrat w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black Montserrat">Add Team Member</DialogTitle>
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
                                        <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
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
                                            <div className="flex items-center gap-2">
                                                {projectMembers.includes(u.id) && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveMember(u.id);
                                                        }}
                                                        className="h-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 Montserrat text-[10px] font-bold"
                                                    >
                                                        Remove
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={invitingId === u.id || projectMembers.includes(u.id)}
                                                    onClick={() => handleInvite(u.id)}
                                                    className={`h-8 border-white/10 transition-all Montserrat ${projectMembers.includes(u.id)
                                                        ? 'bg-[#48A111]/10 text-[#48A111] border-[#48A111]/20 hover:bg-[#48A111]/10 cursor-default'
                                                        : 'hover:bg-primary hover:text-white hover:border-primary'
                                                        }`}
                                                >
                                                    {invitingId === u.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : projectMembers.includes(u.id) ? (
                                                        <div className="flex items-center gap-1">
                                                            <UserPlus className="w-3 h-3 fill-[#48A111]" />
                                                            <span>Added</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-3 h-3 mr-1" />
                                                            Add
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
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

export default Chat;