import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Edit2, Loader2, Clock, User, FileIcon } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import useAuthStore from '@/store/useAuthStore';

const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function DocumentViewer({ documentId, onBack, onEdit, projectManagerId }) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/${documentId}`);
      setDoc(res.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      toast({ title: 'Error', description: 'Failed to fetch document', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!doc) return null;

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="flex flex-row items-start gap-4 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-secondary shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-2xl font-black mb-2">{doc.title}</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {doc.author?.name}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.id === projectManagerId || user?.id === doc.author?.id) && (
          <Button onClick={onEdit} variant="outline" className="rounded-xl shrink-0">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-6 overflow-y-auto bg-card rounded-xl border border-border shadow-sm">
        <div 
          className="prose dark:prose-invert max-w-none prose-sm sm:prose-base"
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
        
        {doc.attachments && (typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments).length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <FileIcon className="w-4 h-4" /> Attachments
            </h4>
            <div className="flex flex-wrap gap-2">
              {(typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments).map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg px-3 py-2 text-sm group transition-colors">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <a href={getFileUrl(file.url)} target="_blank" rel="noopener noreferrer" className="hover:underline text-xs font-medium truncate max-w-[200px]">
                    {file.name}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
