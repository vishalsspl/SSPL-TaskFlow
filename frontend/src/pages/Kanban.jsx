import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, AlertCircle, User, RefreshCw, Plus, MoreVertical, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const Kanban = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: '',
    priority: 'MEDIUM',
    dueDate: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/my-tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreateTask = async (status) => {
    if (!formData.title || !formData.projectId) {
      toast({
        title: "Validation Error",
        description: "Please fill in title and select a project.",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.post('/tasks', {
        ...formData,
        status,
        assignedTo: formData.assignedTo || undefined,
        dueDate: formData.dueDate || undefined,
      });

      setFormData({
        title: '',
        description: '',
        projectId: '',
        assignedTo: '',
        priority: 'MEDIUM',
        dueDate: '',
      });
      setShowCreateForm(null);
      fetchMyTasks();
      toast({
        title: "Task Created",
        description: "Your new task has been added successfully.",
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    try {
      await api.put(`/tasks/${draggedTask.id}`, {
        status: newStatus,
      });

      setTasks(tasks.map(task =>
        task.id === draggedTask.id
          ? { ...task, status: newStatus }
          : task
      ));
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    } finally {
      setDraggedTask(null);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-600 border-gray-200',
      MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
      HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
      URGENT: 'bg-red-50 text-red-700 border-red-300',
    };
    return colors[priority] || colors.MEDIUM;
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Project and Task Management
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">👤 Client - {user?.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={fetchMyTasks} size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Kanban;
