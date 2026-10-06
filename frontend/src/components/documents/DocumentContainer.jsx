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
  AlertCircle, ChevronDown, FileText, Table2, ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { getFileUrl, getPdfAttachment } from '@/lib/utils';

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
  const initialContentRef = useRef('');
  const initialTitleRef = useRef('');
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
      initialContentRef.current = res.data.content || '';
      initialTitleRef.current = res.data.title;
      setLastSaved(new Date(res.data.updatedAt));
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      toast({ title: 'Error', description: 'Failed to load document', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleContentUpdate = useCallback((newContent) => {
    contentRef.current = newContent;
    setContent(newContent);
    if (newContent !== initialContentRef.current) {
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    } else if (titleRef.current === initialTitleRef.current) {
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    }
  }, []);

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    titleRef.current = newTitle;
    setTitle(newTitle);
    if (newTitle !== initialTitleRef.current) {
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    } else if (contentRef.current === initialContentRef.current) {
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    }
  }, []);

  const isDocumentBlank = () => {
    const isPdf = !!getPdfAttachment(doc);
    if (isPdf || doc?.type !== 'DOCUMENT') return false;
    const currentContent = contentRef.current || '';
    const stripped = currentContent.replace(/<[^>]*>?/gm, '').trim();
    const hasMedia = /<img[^>]*>|<iframe[^>]*>|<table[^>]*>/i.test(currentContent);
    return stripped.length === 0 && !hasMedia;
  };

  const deleteIfBlank = async () => {
    const isInitiallyBlank = () => {
      const currentContent = initialContentRef.current || '';
      const stripped = currentContent.replace(/<[^>]*>?/gm, '').trim();
      const hasMedia = /<img[^>]*>|<iframe[^>]*>|<table[^>]*>/i.test(currentContent);
      return stripped.length === 0 && !hasMedia;
    };

    const isUntitled = initialTitleRef.current === 'Untitled Document' || initialTitleRef.current === 'Untitled Spreadsheet';

    // If they hit back or discard, and the document in the database is still a blank untitled document, we delete it to avoid clutter
    if (isInitiallyBlank() && isUntitled) {
      try {
        await api.delete(`/documents/${documentId}`);
      } catch (error) {
        console.error('Failed to delete blank document:', error);
      }
    }
  };

  const handleManualSave = async () => {
    if (!documentId) return;
    
    if (isDocumentBlank()) {
      toast({ title: 'Validation Error', description: 'Cannot save a blank document. Please enter some content.', variant: 'destructive' });
      return false;
    }

    setSaveStatus('saving');
    try {
      await api.put(`/documents/${documentId}`, {
        title: titleRef.current,
        content: contentRef.current,
      });
      initialTitleRef.current = titleRef.current;
      initialContentRef.current = contentRef.current;
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

  const handleBackClick = async () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      await deleteIfBlank();
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
    setShowExitDialog(false);
    await deleteIfBlank();
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

  const pdfAttachment = getPdfAttachment(doc);
  const isPdf = !!pdfAttachment;
  const isDocument = doc.type === 'DOCUMENT' && !isPdf;
  const isSpreadsheet = doc.type === 'SPREADSHEET';

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={handleBackClick} className="rounded-full hover:bg-secondary shrink-0 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isPdf ? (
            <FileText className="w-4 h-4 text-red-600 shrink-0" />
          ) : isDocument ? (
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

          {isPdf ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs gap-1.5"
                onClick={() => window.open(getFileUrl(pdfAttachment.url), '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Tab</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 rounded-lg text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-medium"
                asChild
              >
                <a href={getFileUrl(pdfAttachment.url)} download={pdfAttachment.name || `${title}.pdf`} target="_blank" rel="noopener noreferrer">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
            </div>
          ) : (
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
          )}

          <Button variant="ghost" size="sm" onClick={handleManualSave} className="h-8 w-8 p-0 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Save">
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isPdf ? (
          <div className="flex-1 flex flex-col h-full bg-secondary/10 p-2 sm:p-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-card rounded-t-xl border border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-foreground truncate">{pdfAttachment.name || title}</span>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                PDF Preview
              </span>
            </div>
            <div className="flex-1 bg-card rounded-b-xl border border-t-0 border-border overflow-hidden shadow-sm relative min-h-[500px]">
              <iframe
                src={getFileUrl(pdfAttachment.url)}
                className="w-full h-full min-h-[550px] border-none"
                title={title}
              />
            </div>
          </div>
        ) : (
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
        )}
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
