import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/headerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, MessageSquare, Clock, Search } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import TablePagination from '@/components/ui/table-pagination';

const TicketList = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const { setHeader, searchTerm: globalSearch } = useHeaderStore();
    const navigate = useNavigate();
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Debounce global search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(globalSearch);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [globalSearch]);

    useEffect(() => {
        const title = "Support Tickets";
        const description = user?.role === 'CLIENT'
            ? 'Raise and track support requests for your projects.'
            : 'Manage and respond to client support requests.';
        setHeader(title, description, true, "Search tickets...");

        const fetchTickets = async () => {
            try {
                const params = { page, limit: pageSize };
                if (debouncedSearch) params.search = debouncedSearch;
                const response = await api.get('/tickets', { params });
                setTickets(response.data.data);
                setTotalPages(response.data.pagination.totalPages);
                setTotalItems(response.data.pagination.total);
            } catch (error) {
                console.error('Error fetching tickets:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, [page, pageSize, debouncedSearch]);

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
        <div className="flex-1 flex flex-col h-full overflow-hidden gap-4">
            <div className="flex items-center justify-start">
                {user?.role === 'CLIENT' && (
                    <Button onClick={() => navigate('/tickets/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Ticket
                    </Button>
                )}
            </div>


            <Card className="flex-1 flex flex-col min-h-0">
                <CardContent className="flex-1 flex flex-col min-h-0 pt-6">
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {/* Desktop Table */}
                        <div className="hidden sm:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ticket</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Last Update</TableHead>
                                        <TableHead className="text-center">Action</TableHead>
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
                                                <TableCell className="text-left">
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
                                                        {formatRelativeTime(ticket.updatedAt)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
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
                        </div>

                        {/* Mobile Card List */}
                        <div className="sm:hidden space-y-3 p-1">
                            {tickets.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-sm">No tickets found.</div>
                            ) : (
                                tickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="p-4 rounded-xl border border-border bg-card cursor-pointer active:scale-[0.99] transition-all"
                                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="font-bold text-sm text-foreground line-clamp-1 flex-1">{ticket.title}</p>
                                            <Badge className={`${getStatusColor(ticket.status)} shrink-0 text-[9px]`}>
                                                {ticket.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                                            {ticket.description
                                                .replace(/<[^>]*>?/gm, '')
                                                .replace(/&nbsp;/g, ' ')}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} text-[9px]`}>{ticket.priority}</Badge>
                                                {ticket.client?.name && <span className="truncate max-w-[100px]">{ticket.client.name}</span>}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {formatRelativeTime(ticket.updatedAt)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <TablePagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={(p) => setPage(p)}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default TicketList;