import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Search, MoreVertical, Edit2, Trash2, Clock, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';

export default function DocumentList({ projectId, onNewDocument, onEditDocument, onViewDocument, projectManagers }) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/project/${projectId}`);
      setDocuments(res.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast({ title: 'Error', description: 'Failed to fetch documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/documents/${deleteId}`);
      toast({ title: 'Success', description: 'Document deleted successfully' });
      setDeleteId(null);
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const filteredDocs = documents.filter(doc => doc.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72 m-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            className="!pl-10 bg-card border-border rounded-xl w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={onNewDocument} className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> New Document
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
            <p className="text-lg font-bold text-foreground mb-1">No documents found</p>
            <p className="text-sm text-muted-foreground mb-6">Get started by creating your first project document.</p>
            <Button onClick={onNewDocument} variant="outline" className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Create Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => onViewDocument(doc.id)}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3 w-full min-w-0 pr-4">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-bold truncate leading-tight">{doc.title}</CardTitle>
                    <CardDescription className="text-xs truncate flex items-center gap-1 mt-1">
                      <User className="w-3 h-3" /> {doc.author?.name}
                    </CardDescription>
                  </div>
                </div>
                {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || projectManagers?.some(m => m.id === user?.id) || user?.id === doc.author?.id) && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem onClick={() => onEditDocument(doc.id)} className="cursor-pointer">
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(doc.id)} className="cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-4 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
