import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  FileText, Table2, Upload, FileSpreadsheet,
  ClipboardList, FileEdit, Calendar, BarChart3,
  Loader2, Plus,
} from 'lucide-react';
import api from '@/lib/api';

const DOC_TEMPLATES = [
  {
    id: 'requirements',
    name: 'Project Requirements',
    icon: ClipboardList,
    description: 'Outline project requirements and specifications',
    content: '<h1>Project Requirements</h1><h2>1. Overview</h2><p>Describe the project overview here.</p><h2>2. Functional Requirements</h2><ul><li>Requirement 1</li><li>Requirement 2</li></ul><h2>3. Non-Functional Requirements</h2><ul><li>Performance</li><li>Security</li><li>Scalability</li></ul><h2>4. Timeline</h2><p>Add timeline details here.</p>',
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    icon: FileEdit,
    description: 'Capture meeting discussions and action items',
    content: '<h1>Meeting Notes</h1><h2>Date:</h2><p>[Date]</p><h2>Attendees</h2><ul><li>Name 1</li><li>Name 2</li></ul><h2>Agenda</h2><ol><li>Topic 1</li><li>Topic 2</li></ol><h2>Discussion</h2><p>Notes from discussion...</p><h2>Action Items</h2><ul><li>[ ] Action item 1 - Owner</li><li>[ ] Action item 2 - Owner</li></ul><h2>Next Meeting</h2><p>[Date and time]</p>',
  },
  {
    id: 'release-notes',
    name: 'Release Notes',
    icon: FileText,
    description: 'Document release changes and updates',
    content: '<h1>Release Notes - v1.0.0</h1><h2>Release Date:</h2><p>[Date]</p><h2>New Features</h2><ul><li>Feature 1: Description</li><li>Feature 2: Description</li></ul><h2>Improvements</h2><ul><li>Improvement 1</li></ul><h2>Bug Fixes</h2><ul><li>Fixed issue with...</li></ul><h2>Known Issues</h2><ul><li>Issue description</li></ul>',
  },
];

const SHEET_TEMPLATES = [
  {
    id: 'budget',
    name: 'Budget Tracker',
    icon: BarChart3,
    description: 'Track project budget and expenses',
    content: JSON.stringify({
      sheets: {
        sheet1: {
          id: 'sheet1',
          name: 'Budget',
          cellData: {
            0: { 0: { v: 'Category', s: { bold: true, bg: '#f0f0f0' } }, 1: { v: 'Budget', s: { bold: true, bg: '#f0f0f0' } }, 2: { v: 'Actual', s: { bold: true, bg: '#f0f0f0' } }, 3: { v: 'Difference', s: { bold: true, bg: '#f0f0f0' } } },
            1: { 0: { v: 'Development' }, 1: { v: 50000 }, 2: { v: 0 }, 3: { v: '=B2-C2' } },
            2: { 0: { v: 'Design' }, 1: { v: 15000 }, 2: { v: 0 }, 3: { v: '=B3-C3' } },
            3: { 0: { v: 'Marketing' }, 1: { v: 20000 }, 2: { v: 0 }, 3: { v: '=B4-C4' } },
            4: { 0: { v: 'Infrastructure' }, 1: { v: 10000 }, 2: { v: 0 }, 3: { v: '=B5-C5' } },
            5: { 0: { v: 'Total', s: { bold: true } }, 1: { v: '=SUM(B2:B5)', s: { bold: true } }, 2: { v: '=SUM(C2:C5)', s: { bold: true } }, 3: { v: '=SUM(D2:D5)', s: { bold: true } } },
          },
          rowCount: 50,
          columnCount: 26,
        }
      }
    }),
  },
  {
    id: 'sprint',
    name: 'Sprint Tracker',
    icon: Calendar,
    description: 'Track sprint progress and tasks',
    content: JSON.stringify({
      sheets: {
        sheet1: {
          id: 'sheet1',
          name: 'Sprint',
          cellData: {
            0: { 0: { v: 'Task', s: { bold: true, bg: '#f0f0f0' } }, 1: { v: 'Assignee', s: { bold: true, bg: '#f0f0f0' } }, 2: { v: 'Status', s: { bold: true, bg: '#f0f0f0' } }, 3: { v: 'Story Points', s: { bold: true, bg: '#f0f0f0' } }, 4: { v: 'Due Date', s: { bold: true, bg: '#f0f0f0' } } },
            1: { 0: { v: 'Task 1' }, 1: { v: '' }, 2: { v: 'TODO' }, 3: { v: 3 }, 4: { v: '' } },
            2: { 0: { v: 'Task 2' }, 1: { v: '' }, 2: { v: 'TODO' }, 3: { v: 5 }, 4: { v: '' } },
          },
          rowCount: 50,
          columnCount: 26,
        }
      }
    }),
  },
];

export default function CreateDocumentModal({ open, onOpenChange, projectId, onCreated }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('create');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleCreate = async (type, title, content = '') => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await api.post(`/documents/project/${projectId}`, {
        title: title || (type === 'SPREADSHEET' ? 'Untitled Spreadsheet' : 'Untitled Document'),
        type,
        content,
      });
      toast({ title: 'Success', description: `${type === 'SPREADSHEET' ? 'Spreadsheet' : 'Document'} created` });
      onOpenChange(false);
      if (onCreated) onCreated(res.data);
    } catch (error) {
      console.error('Failed to create document:', error);
      toast({ title: 'Error', description: 'Failed to create document', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['docx', 'xlsx'].includes(ext)) {
      toast({ title: 'Error', description: 'Only .docx and .xlsx files are supported', variant: 'destructive' });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be under 25MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/documents/import/project/${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast({ title: 'Success', description: `Imported "${res.data.title}" successfully` });
      onOpenChange(false);
      if (onCreated) onCreated(res.data);
    } catch (error) {
      console.error('Failed to import file:', error);
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to import file', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-black">New Document</DialogTitle>
          <DialogDescription>Choose a type or start from a template</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pb-2">
          {[
            { id: 'create', label: 'Create' },
            { id: 'templates', label: 'Templates' },
            { id: 'import', label: 'Import' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 max-h-[400px] overflow-y-auto">
          {/* Create Tab */}
          {tab === 'create' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleCreate('DOCUMENT', 'Untitled Document')}
                disabled={creating}
                className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm">Blank Document</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Create a new Word-like document</p>
                </div>
              </button>

              <button
                onClick={() => handleCreate('SPREADSHEET', 'Untitled Spreadsheet', '{}')}
                disabled={creating}
                className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
              >
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20">
                  <Table2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm">Blank Spreadsheet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Create a new Excel-like spreadsheet</p>
                </div>
              </button>
            </div>
          )}

          {/* Templates Tab */}
          {tab === 'templates' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Documents</p>
                <div className="grid grid-cols-1 gap-2">
                  {DOC_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleCreate('DOCUMENT', tpl.name, tpl.content)}
                      disabled={creating}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                        <tpl.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Spreadsheets</p>
                <div className="grid grid-cols-1 gap-2">
                  {SHEET_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleCreate('SPREADSHEET', tpl.name, tpl.content)}
                      disabled={creating}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <tpl.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {tab === 'import' && (
            <div className="flex flex-col items-center justify-center py-8">
              <input
                type="file"
                ref={fileInputRef}
                accept=".docx,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="p-4 rounded-2xl bg-secondary/50 mb-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-bold text-sm mb-1">Upload a file</p>
              <p className="text-xs text-muted-foreground mb-4">Supports .docx and .xlsx files (max 25MB)</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-xl px-6"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" /> Choose File
                  </>
                )}
              </Button>
            </div>
          )}

          {creating && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Creating...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
