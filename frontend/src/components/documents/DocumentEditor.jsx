import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, FileIcon, X } from 'lucide-react';
import api from '@/lib/api';

const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function DocumentEditor({ projectId, documentId, onBack, onSave }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/${documentId}`);
      setTitle(res.data.title);
      setContent(res.data.content);
      setAttachments(res.data.attachments ? (typeof res.data.attachments === 'string' ? JSON.parse(res.data.attachments) : res.data.attachments) : []);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      toast({ title: 'Error', description: 'Failed to fetch document', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (documentId) {
        await api.put(`/documents/${documentId}`, { title, content, attachments });
        toast({ title: 'Success', description: 'Document updated successfully' });
      } else {
        await api.post(`/documents/project/${projectId}`, { title, content, attachments });
        toast({ title: 'Success', description: 'Document created successfully' });
      }
      onSave();
    } catch (error) {
      console.error('Failed to save document:', error);
      toast({ title: 'Error', description: 'Failed to save document', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="h-full flex flex-col border-none shadow-none">
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <Input 
            placeholder="Document Title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto">
        <div className="h-full bg-background min-h-[500px]">
          <style>{`
            .ck-editor__editable {
              min-height: 500px;
              border: none !important;
              box-shadow: none !important;
            }
            .ck-toolbar {
              border: none !important;
              border-bottom: 1px solid hsl(var(--border)) !important;
              background: hsl(var(--secondary)) !important;
            }
          `}</style>
          <RichTextEditor
            value={content}
            onChange={(value) => setContent(value)}
            placeholder="Start typing your document..."
            onAttach={(fileData) => setAttachments(prev => [...prev, fileData])}
          />
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 px-4 pb-4">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-secondary/40 border border-border/60 rounded-md px-3 py-1.5 text-sm group">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <a href={getFileUrl(file.url)} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px] text-xs font-medium">
                    {file.name}
                  </a>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
