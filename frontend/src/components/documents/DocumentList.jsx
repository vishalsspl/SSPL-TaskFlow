import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, Plus, Search, MoreVertical, Edit2, Trash2,
  Clock, User, Copy, Download, Table2, Filter,
  ArrowUpDown, SortAsc, SortDesc, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';

export default function DocumentList({ projectId, onNewDocument, onEditDocument, onViewDocument, projectManagers, presentationMode = false }) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [duplicating, setDuplicating] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [projectId, sortBy, sortOrder]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy, order: sortOrder });
      const res = await api.get(`/documents/project/${projectId}?${params}`);
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

  const handleDuplicate = async (id) => {
    setDuplicating(id);
    try {
      await api.post(`/documents/${id}/duplicate`);
      toast({ title: 'Success', description: 'Document duplicated' });
      fetchDocuments();
    } catch (error) {
      console.error('Failed to duplicate:', error);
      toast({ title: 'Error', description: 'Failed to duplicate document', variant: 'destructive' });
    } finally {
      setDuplicating(null);
    }
  };

  const handleExport = async (doc) => {
    try {
      const format = doc.type === 'SPREADSHEET' ? 'xlsx' : 'docx';
      const response = await api.get(`/documents/${doc.id}/export?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${doc.title}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export', variant: 'destructive' });
    }
  };

  const handleRename = async (doc) => {
    const newTitle = prompt('Enter new name:', doc.title);
    if (newTitle && newTitle !== doc.title) {
      try {
        await api.put(`/documents/${doc.id}`, { title: newTitle });
        toast({ title: 'Success', description: 'Document renamed' });
        fetchDocuments();
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to rename', variant: 'destructive' });
      }
    }
  };

  const canModify = (doc) => {
    return user?.role === 'ADMIN' || user?.role === 'SUPERADMIN'
      || projectManagers?.some(m => m.id === user?.id)
      || user?.id === doc.author?.id;
  };

  // Filter and search
  const filteredDocs = documents.filter(doc => {
    const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || doc.type === typeFilter;
    return matchSearch && matchType;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="!pl-10 bg-card border-border rounded-xl w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">
                  {typeFilter === 'ALL' ? 'All' : typeFilter === 'DOCUMENT' ? 'Docs' : 'Sheets'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTypeFilter('ALL')}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('DOCUMENT')}>Documents</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('SPREADSHEET')}>Spreadsheets</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => toggleSort('updatedAt')}>
                Last Modified {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('title')}>
                Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('createdAt')}>
                Created Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!presentationMode && (
          <Button onClick={onNewDocument} className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> New Document
          </Button>
        )}
      </div>

      {/* Content */}
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
            {!presentationMode && (
              <Button onClick={onNewDocument} variant="outline" className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> Create Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isSpreadsheet = doc.type === 'SPREADSHEET';
            return (
              <Card
                key={doc.id}
                className="hover:border-primary/50 transition-colors group cursor-pointer"
                onClick={() => onViewDocument(doc.id)}
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3 w-full min-w-0 pr-4">
                    <div className={`p-2 rounded-lg shrink-0 ${isSpreadsheet ? 'bg-emerald-500/10' : 'bg-primary/10'}`}>
                      {isSpreadsheet ? (
                        <Table2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-bold truncate leading-tight">{doc.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 h-4 ${isSpreadsheet ? 'bg-emerald-500/10 text-emerald-700' : 'bg-blue-500/10 text-blue-700'}`}
                        >
                          {isSpreadsheet ? 'Spreadsheet' : 'Document'}
                        </Badge>
                        <CardDescription className="text-xs truncate flex items-center gap-1">
                          <User className="w-3 h-3" /> {doc.author?.name}
                        </CardDescription>
                      </div>
                    </div>
                  </div>

                  {canModify(doc) && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuItem onClick={() => onViewDocument(doc.id)} className="cursor-pointer">
                            <FileText className="mr-2 h-4 w-4" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditDocument(doc.id)} className="cursor-pointer">
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRename(doc)} className="cursor-pointer">
                            <Edit2 className="mr-2 h-4 w-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(doc.id)}
                            disabled={duplicating === doc.id}
                            className="cursor-pointer"
                          >
                            {duplicating === doc.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(doc)} className="cursor-pointer">
                            <Download className="mr-2 h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(doc.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
