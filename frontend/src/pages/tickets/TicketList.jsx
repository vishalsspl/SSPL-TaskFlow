import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TicketList = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const response = await api.get('/tickets');
                setTickets(response.data);
            } catch (error) {
                console.error('Error fetching tickets:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-500';
            case 'IN_PROGRESS': return 'bg-yellow-500';
            case 'RESOLVED': return 'bg-green-500';
            case 'CLOSED': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'URGENT': return 'text-red-500 border-red-500';
            case 'HIGH': return 'text-orange-500 border-orange-500';
            case 'MEDIUM': return 'text-blue-500 border-blue-500';
            case 'LOW': return 'text-green-500 border-green-500';
            default: return '';
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full">Loading tickets...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
                    <p className="text-muted-foreground">
                        {user?.role === 'CLIENT'
                            ? 'Raise and track support requests for your projects.'
                            : 'Manage and respond to client support requests.'}
                    </p>
                </div>
                {user?.role === 'CLIENT' && (
                    <Button onClick={() => navigate('/tickets/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Ticket
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Tickets</CardTitle>
                    <CardDescription>
                        List of support tickets and their current status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ticket</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Last Update</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No tickets found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        <TableCell>
                                            <div className="font-medium">{ticket.title}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-1">
                                                {ticket.description
                                                    .replace(/<[^>]*>?/gm, '')
                                                    .replace(/&nbsp;/g, ' ')
                                                    .replace(/&amp;/g, '&')
                                                    .replace(/&quot;/g, '"')
                                                    .replace(/&apos;/g, "'")
                                                    .replace(/&lt;/g, '<')
                                                    .replace(/&gt;/g, '>')}
                                            </div>
                                        </TableCell>
                                        <TableCell>{ticket.client?.name}</TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(ticket.status)}>
                                                {ticket.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                                                {ticket.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default TicketList;
