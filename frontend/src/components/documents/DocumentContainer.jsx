import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Save, Loader2, Download, Check,
  AlertCircle, ChevronDown, FileText, Table2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const TiptapWordEditor = lazy(() => import('./editor/TiptapWordEditor'));
const UniverSpreadsheetEditor = lazy(() => import('./editor/UniverSpreadsheetEditor'));

const AUTOSAVE_DELAY = 1500;

export default function DocumentContainer({ projectId, documentId, onBack, projectManagers }) {
  const { toast } = useToast();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  const saveTimeoutRef = useRef(null);
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const isMountedRef = useRef(true);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch document
  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/documents/${documentId}`);
      setDoc(res.data);
      setTitle(res.data.title);
      setContent(res.data.content || '');
      contentRef.current = res.data.content || '';
      titleRef.current = res.data.title;
      setLastSaved(new Date(res.data.updatedAt));
      
      const createdTime = new Date(res.data.createdAt).getTime();
      const updatedTime = new Date(res.data.updatedAt).getTime();
      
      if (Math.abs(createdTime - updatedTime) < 1000) {
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
      } else {
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
      toast({ title: 'Error', description: 'Failed to load document', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  }, []);

  const handleContentUpdate = useCallback((newContent) => {
    contentRef.current = newContent;
    setContent(newContent);
    markUnsaved();
  }, [markUnsaved]);

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    titleRef.current = newTitle;
    setTitle(newTitle);
    markUnsaved();
  }, [markUnsaved]);

  // Manual save
  const handleManualSave = async () => {
    if (!documentId) return;
    
    setSaveStatus('saving');
    try {
      await api.put(`/documents/${documentId}`, {
        title: titleRef.current,
        content: contentRef.current,
      });
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast({ title: 'Saved', description: 'Document saved successfully' });
      return true;
    } catch (error) {
      setSaveStatus('error');
      toast({ title: 'Error', description: 'Failed to save document', variant: 'destructive' });
      return false;
    }
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      onBack();
    }
  };

  const handleConfirmSaveExit = async () => {
    const success = await handleManualSave();
    if (success) {
      setShowExitDialog(false);
      onBack();
    }
  };

  const handleDiscardExit = async () => {
    // If it's a completely untouched new document, delete it so it doesn't clutter the list
    if (doc && new Date(doc.createdAt).getTime() === new Date(doc.updatedAt).getTime()) {
      try {
        await api.delete(`/documents/${documentId}`);
      } catch (e) {
        console.error('Failed to cleanup new document', e);
      }
    }
    setShowExitDialog(false);
    onBack();
  };

  // Export
  const handleExport = async (format) => {
    if (!documentId) return;
    setExporting(true);
    try {
      const response = await api.get(`/documents/${documentId}/export?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'json' ? 'json' : format;
      link.setAttribute('download', `${title}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: `Downloaded as .${ext}` });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Error', description: 'Failed to export document', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const SaveStatusBadge = () => {
    const config = {
      saved: { icon: Check, text: lastSaved ? `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}` : 'Saved', className: 'text-emerald-600' },
      saving: { icon: Loader2, text: 'Saving...', className: 'text-muted-foreground' },
      unsaved: { icon: null, text: 'Unsaved changes', className: 'text-amber-600' },
      error: { icon: AlertCircle, text: 'Save failed', className: 'text-destructive' },
    };
    const s = config[saveStatus];
    return (
      <div className={`flex items-center gap-1.5 text-xs ${s.className}`}>
        {s.icon && <s.icon className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />}
        <span className="hidden sm:inline">{s.text}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="font-bold text-lg">Document not found</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Documents
        </Button>
      </div>
    );
  }

  const isDocument = doc.type === 'DOCUMENT';
  const isSpreadsheet = doc.type === 'SPREADSHEET';

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={handleBackClick} className="rounded-full hover:bg-secondary shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isDocument ? (
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
          ) : (
            <Table2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <Input
            value={title}
            onChange={handleTitleChange}
            className="text-sm sm:text-base font-bold border-none shadow-none focus-visible:ring-0 px-0 h-8 bg-transparent"
            placeholder="Document title..."
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SaveStatusBadge />

          {saveStatus === 'error' && (
            <Button variant="ghost" size="sm" onClick={handleManualSave} className="h-7 px-2 text-xs">
              Retry
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-lg gap-1" disabled={exporting}>
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-xs">Export</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isDocument && (
                <DropdownMenuItem onClick={() => handleExport('docx')}>
                  Download as .docx
                </DropdownMenuItem>
              )}
              {isSpreadsheet && (
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  Download as .xlsx
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Download as .json
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={handleManualSave} className="h-8 w-8 p-0 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Save">
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }>
          {isDocument && (
            <TiptapWordEditor
              content={content}
              onUpdate={handleContentUpdate}
              editable={true}
            />
          )}
          {isSpreadsheet && (
            <UniverSpreadsheetEditor
              content={content}
              onUpdate={handleContentUpdate}
            />
          )}
        </Suspense>
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this document. Do you want to save before exiting?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardExit}>Don't Save</Button>
            <Button onClick={handleConfirmSaveExit}>Save</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
