import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Calendar, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Label } from './ui/label';
import { toast } from '../hooks/use-toast';
import api from '../lib/api';
import { format } from 'date-fns';
import DeleteConfirmDialog from './ui/delete-confirm-dialog';
import { useAuthStore } from '../store/authStore';

const WorkLogPanel = ({ taskId, projectId }) => {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [logToDelete, setLogToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { taskId, projectId };
      const response = await api.get(`/worklogs`, { params });
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching worklogs:', error);
      toast({
        title: "Error",
        description: "Failed to load worklogs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [taskId, projectId]);

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!hours || !date) return;

    try {
      await api.post('/worklogs', {
        projectId,
        taskId,
        hours: parseFloat(hours),
        description,
        date: new Date(date).toISOString()
      });

      toast({
        title: "Log Added",
        description: "Work log entry created successfully."
      });

      setHours('');
      setDescription('');
      fetchLogs();
    } catch (error) {
      console.error('Error adding worklog:', error);
      toast({
        title: "Error",
        description: "Failed to add worklog.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLog = async (logId) => {
    setLogToDelete(logId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;

    try {
      await api.delete(`/worklogs/${logId}`);
      toast({
        title: "Deleted",
        description: "Work log entry removed."
      });
      fetchLogs();
      toast({
        title: "Error",
        description: "Failed to delete worklog.",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
      setLogToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {!['ADMIN', 'SUPERADMIN'].includes(user?.role) && (
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-md flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Add Work Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddLog} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs">Date</Label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Hours</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  placeholder="e.g. 1.5"
                  value={hours} 
                  onChange={(e) => setHours(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input 
                  placeholder="What did you do?" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button type="submit" className="h-9 w-full">
                Save Log
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          Log History
        </h3>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground text-sm">
            No work logs found for this task.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className="hover:border-primary/30 transition-colors group">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.loggedAt), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded font-semibold">
                          <Clock className="w-3 h-3" />
                          {(log.minutes / 60).toFixed(1)} hrs
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <User className="w-3 h-3" />
                          {log.user?.name}
                        </span>
                      </div>
                      <p className="text-sm pt-1">{log.comment || 'No description'}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2"
                      onClick={() => handleDeleteLog(log.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmDialog 
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Work Log"
        description="Are you sure you want to delete this work log entry? This will permanently remove the hours from this task."
      />
    </div>
  );
};

export default WorkLogPanel;
