import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Edit2, Loader2, Clock, User, FileIcon, ExternalLink, Download } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { getFileUrl, getPdfAttachment } from '@/lib/utils';

export default function DocumentViewer({ documentId, onBack, onEdit, projectManagers }) {
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

  const pdfAttachment = getPdfAttachment(doc);
  const formattedContent = (doc.content || '').replace(/src=["'](\/uploads\/[^"']+)["']/g, (match, path) => `src="${getFileUrl(path)}"`);

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="flex flex-row items-start gap-4 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-secondary shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-2xl font-black mb-2 flex items-center gap-2">
            {doc.title}
            {pdfAttachment && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                PDF
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {doc.author?.name}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || projectManagers?.some(m => m.id === user?.id) || user?.id === doc.author?.id) && (
          <Button onClick={onEdit} variant="outline" className="rounded-xl shrink-0">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-6 overflow-y-auto bg-card rounded-xl border border-border shadow-sm">
        {pdfAttachment ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <FileIcon className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-foreground truncate">{pdfAttachment.name || doc.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs gap-1.5"
                  onClick={() => window.open(getFileUrl(pdfAttachment.url), '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 rounded-lg text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                  asChild
                >
                  <a href={getFileUrl(pdfAttachment.url)} download={pdfAttachment.name || `${doc.title}.pdf`} target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </a>
                </Button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-border min-h-[600px]">
              <iframe
                src={getFileUrl(pdfAttachment.url)}
                className="w-full h-[650px] border-none"
                title={doc.title}
              />
            </div>
          </div>
        ) : (
          <div 
            className="prose dark:prose-invert max-w-none prose-sm sm:prose-base"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        )}
        
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
