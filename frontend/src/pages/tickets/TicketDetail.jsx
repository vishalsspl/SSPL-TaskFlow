import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { toast } = useToast();

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const fetchTicket = async () => {
        try {
            const response = await api.get(`/tickets/${id}`);
            setTicket(response.data);
        } catch (error) {
            console.error('Error fetching ticket:', error);
            toast({
                title: "Error",
                description: "Failed to load ticket details",
                variant: "destructive",
            });
            navigate('/tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await api.patch(`/tickets/${id}/status`, { status: newStatus });
            setTicket({ ...ticket, status: newStatus });
            toast({
                title: "Success",
                description: `Status updated to ${newStatus.replace('_', ' ')}`,
            });
        } catch (error) {
            console.error('Error updating status:', error);
            toast({
                title: "Error",
                description: "Failed to update status",
                variant: "destructive",
            });
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setSubmittingComment(true);
        try {
            const response = await api.post(`/tickets/${id}/comments`, { message: comment });
            setTicket({
                ...ticket,
                comments: [...ticket.comments, response.data],
            });
            setComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
            toast({
                title: "Error",
                description: "Failed to add comment",
                variant: "destructive",
            });
        } finally {
            setSubmittingComment(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full">Loading ticket...</div>;
    if (!ticket) return <div className="p-6">Ticket not found.</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Button variant="ghost" onClick={() => navigate('/tickets')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tickets
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Ticket Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">#{ticket.id.slice(0, 8)}</Badge>
                                        <Badge className={
                                            ticket.status === 'OPEN' ? 'bg-blue-500' :
                                                ticket.status === 'IN_PROGRESS' ? 'bg-yellow-500' :
                                                    ticket.status === 'RESOLVED' ? 'bg-green-500' : 'bg-gray-500'
                                        }>
                                            {ticket.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-2xl mt-2">{ticket.title}</CardTitle>
                                </div>
                                {(user.role === 'ADMIN' || user?.permissions?.['tickets.manage']) && (
                                    <div className="w-full sm:w-40">
                                        <SearchableSelect
                                            value={ticket.status}
                                            onChange={handleUpdateStatus}
                                            disabled={updatingStatus}
                                            options={[
                                                { label: 'Open', value: 'OPEN' },
                                                { label: 'In Progress', value: 'IN_PROGRESS' },
                                                { label: 'Resolved', value: 'RESOLVED' },
                                                { label: 'Closed', value: 'CLOSED' }
                                            ]}
                                            placeholder="Status"
                                        />
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: ticket.description }}
                            />
                        </CardContent>
                        <CardFooter className="border-t pt-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-2">
                            <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Submitted by {ticket.client.name}
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(ticket.createdAt), 'PPpp')}
                            </div>
                        </CardFooter>
                    </Card>

                    {/* Comments Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            Activity History
                        </h3>

                        <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/20">
                            <div className="space-y-6">
                                {ticket.comments.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No comments yet. Start the conversation!</p>
                                ) : (
                                    ticket.comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-4">
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                                <AvatarImage src={comment.user.avatar} />
                                                <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span className="text-sm font-semibold">{comment.user.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(comment.createdAt), 'PPp')}</span>
                                                </div>
                                                <div className="text-sm bg-background p-3 rounded-lg border shadow-sm">
                                                    {comment.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        {/* Comment Box */}
                        <form onSubmit={handleAddComment} className="space-y-3">
                            <Textarea
                                placeholder="Write a comment..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={submittingComment || !comment.trim()} size="sm">
                                    <Send className="w-4 h-4 mr-2" />
                                    Add Comment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Ticket Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Priority</Label>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${ticket.priority === 'URGENT' ? 'bg-red-500' :
                                        ticket.priority === 'HIGH' ? 'bg-orange-500' :
                                            ticket.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-green-500'
                                        }`} />
                                    <span className="text-sm font-medium">{ticket.priority}</span>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground">Contact Information</Label>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border">
                                        <AvatarImage src={ticket.client.avatar} />
                                        <AvatarFallback>{ticket.client.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium truncate">{ticket.client.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{ticket.client.email}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TicketDetail;