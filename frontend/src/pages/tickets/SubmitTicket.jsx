import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';

const SubmitTicket = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !description) {
            toast({
                title: "Error",
                description: "Please fill in all the required fields.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await api.post('/tickets', { title, description, priority });
            toast({
                title: "Success",
                description: "Ticket submitted successfully",
            });
            navigate('/tickets');
        } catch (error) {
            console.error('Error submitting ticket:', error);
            toast({
                title: "Error",
                description: "Failed to submit ticket",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => navigate('/tickets')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tickets
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Submit a New Ticket</CardTitle>
                    <CardDescription>
                        Report an issue or request support. We'll get back to you as soon as possible.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-foreground/90 font-semibold">Ticket Title</Label>
                            <Input
                                id="title"
                                placeholder="Brief summary of the issue"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority" className="text-foreground/90 font-semibold">Priority</Label>
                            <SearchableSelect
                                value={priority}
                                onChange={setPriority}
                                options={[
                                    { label: 'Low', value: 'LOW' },
                                    { label: 'Medium', value: 'MEDIUM' },
                                    { label: 'High', value: 'HIGH' },
                                    { label: 'Urgent', value: 'URGENT' }
                                ]}
                                placeholder="Select priority"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-foreground/90 font-semibold">Description</Label>
                            <RichTextEditor
                                id="description"
                                value={description}
                                onChange={setDescription}
                                placeholder="Provide detailed information about your request..."
                            />
                        </div>
                    </CardContent >
                    <CardFooter className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => navigate('/tickets')} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Ticket'}
                        </Button>
                    </CardFooter>
                </form >
            </Card >
        </div >
    );
};

export default SubmitTicket;
