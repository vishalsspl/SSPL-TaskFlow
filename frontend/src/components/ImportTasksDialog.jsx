import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileSpreadsheet, Upload, Download, CheckCircle2, XCircle, AlertTriangle,
  FileUp, Loader2, Info, ArrowLeft, Sparkles, X, ListTodo, Target, User, Calendar
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const REQUIRED_FIELDS = [
  { key: 'title', label: 'Task Title', description: 'What needs to be done', example: 'Design Homepage UI', required: true },
  { key: 'projectName', label: 'Project Name', description: 'Name of an existing project', example: 'Web Redesign 2024', required: true },
  { key: 'assigneeEmails', label: 'Assignees', description: 'Comma separated emails', example: 'john@demo.com, sarah@demo.com', required: false },
  { key: 'status', label: 'Status', description: 'TODO, IN_PROGRESS, COMPLETED etc', example: 'TODO', required: false },
];

const STEPS = {
  INFO: 'info',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  RESULTS: 'results',
};

const ImportTasksDialog = ({ open, onOpenChange, onImportComplete, users = [] }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(STEPS.INFO);
  const [parsedItems, setParsedItems] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');

  const resetState = () => {
    setStep(STEPS.INFO);
    setParsedItems([]);
    setParseErrors([]);
    setImportResults(null);
    setImporting(false);
    setFileName('');
  };

  const handleClose = (val) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      { 'Task Title': 'Design Landing Page', 'Description': 'Create high-fidelity mockups', 'Project Name': 'TaskFlow Web', 'Phase Name': 'Design', 'Assignee Emails': 'designer@company.com', 'Priority': 'HIGH', 'Status': 'TODO', 'Points': 5, 'Due Date': '2024-12-01' },
      { 'Task Title': 'API Integration', 'Description': 'Connect auth endpoints', 'Project Name': 'TaskFlow Mobile', 'Phase Name': 'Development', 'Assignee Emails': 'dev1@company.com, dev2@company.com', 'Priority': 'MEDIUM', 'Status': 'IN_PROGRESS', 'Points': 8, 'Due Date': '2024-11-15' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'TaskFlow_Tasks_Template.xlsx');
  };

  const parseFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonData.length === 0) {
          setParseErrors(['Spreadsheet is empty.']);
          return;
        }

        const formatDate = (val) => {
          if (!val) return '';
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
          }
          return String(val).trim();
        };

        const normalizedData = jsonData.map((row) => {
          const n = {};
          Object.keys(row).forEach(key => {
            const k = key.toLowerCase().trim().replace(/\s+/g, '');
            if (k.includes('title') || k === 'task') n.title = String(row[key]).trim();
            else if (k.includes('description')) n.description = String(row[key]).trim();
            else if (k.includes('projectname') || k === 'project') n.projectName = String(row[key]).trim();
            else if (k.includes('phasename') || k === 'phase') n.phaseName = String(row[key]).trim();
            else if (k.includes('assignee') || k.includes('email')) n.assigneeEmails = String(row[key]).trim();
            else if (k.includes('status')) n.status = String(row[key]).trim().toUpperCase();
            else if (k.includes('priority')) n.priority = String(row[key]).trim().toUpperCase();
            else if (k.includes('points') || k.includes('story')) n.storyPoints = row[key];
            else if (k.includes('due') || k.includes('date')) n.dueDate = formatDate(row[key]);
            else if (k.includes('tag')) n.tags = String(row[key]).split(',').map(t => t.trim()).filter(t => t);
            else if (k.includes('type')) n.type = String(row[key]).trim().toUpperCase();
          });
          return n;
        });


        const errors = [];
        const validated = normalizedData.map((item, idx) => {
          const rowErrors = [];
          if (!item.title) rowErrors.push('Missing Title');
          else if (!/^[a-zA-Z0-9\s]+$/.test(item.title)) rowErrors.push('Special characters in title');

          if (!item.projectName) rowErrors.push('Missing Project Name');

          if (item.dueDate && isNaN(new Date(item.dueDate).getTime())) rowErrors.push('Invalid Due Date format');

          if (item.assigneeEmails) {
            const emails = [...new Set(item.assigneeEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e))];
            if (emails.length > 0) {
              const registeredEmails = users.map(u => u.email.toLowerCase());
              const unregistered = emails.filter(e => !registeredEmails.includes(e));
              if (unregistered.length > 0) {
                rowErrors.push(`Assignee email(s) not registered: ${unregistered.join(', ')}`);
              }
            }
          }

          if (rowErrors.length > 0) errors.push(`Row ${idx + 2}: ${rowErrors.join(', ')}`);
          return { ...item, _rowNum: idx + 2, _valid: rowErrors.length === 0, _errors: rowErrors };
        });

        setParsedItems(validated);
        setParseErrors(errors);
        setStep(STEPS.PREVIEW);
      } catch (err) {
        toast({ title: 'Parse Error', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const handleImport = async () => {
    const validOnes = parsedItems.filter(p => p._valid).map(({ _rowNum, _valid, _errors, ...p }) => p);
    if (validOnes.length === 0) return;

    setImporting(true);
    setStep(STEPS.IMPORTING);

    try {
      const res = await api.post('/tasks/bulk-create', { tasks: validOnes });
      setImportResults(res.data);
      setStep(STEPS.RESULTS);
      if (res.data.summary.success > 0) onImportComplete?.();
    } catch (err) {
      toast({ title: 'Import Failed', description: err.response?.data?.error || err.message, variant: 'destructive' });
      setStep(STEPS.PREVIEW);
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedItems.filter(i => i._valid).length;
  const invalidCount = parsedItems.filter(i => !i._valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-lg font-bold tracking-tight">
                {step === STEPS.INFO && 'Bulk Import Tasks'}
                {step === STEPS.PREVIEW && 'Preview Task Data'}
                {step === STEPS.IMPORTING && 'Importing Tasks...'}
                {step === STEPS.RESULTS && 'Import Summary'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {step === STEPS.INFO && 'Upload a spreadsheet to import tasks into projects'}
                {step === STEPS.PREVIEW && `${validCount} valid tasks found in ${fileName}`}
                {step === STEPS.RESULTS && importResults?.message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === STEPS.INFO && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REQUIRED_FIELDS.map(f => (
                  <div key={f.key} className="p-4 rounded-2xl border border-border/40 bg-secondary/20 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{f.label}</span>
                      {f.required && <Badge className="text-[8px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/20 font-black">REQUIRED</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{f.description}</p>
                    <code className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded-md font-bold">e.g. {f.example}</code>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={downloadTemplate} className="w-full h-12 rounded-xl border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs gap-2 transition-all">
                <Download className="w-4 h-4" /> Download Sample Task Template
              </Button>

              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragOver ? 'border-primary bg-primary/10' : 'border-border/40 bg-secondary/10 hover:border-primary/40'}`}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); parseFile(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => parseFile(e.target.files[0])} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center"><FileUp className="w-6 h-6 text-primary" /></div>
                  <p className="text-sm font-bold">Drop your task spreadsheet here</p>
                </div>
              </div>
            </div>
          )}

          {step === STEPS.PREVIEW && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold gap-1"><CheckCircle2 className="w-3 h-3" /> {validCount} valid</Badge>
                {invalidCount > 0 && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs font-bold gap-1"><XCircle className="w-3 h-3" /> {invalidCount} errors</Badge>}
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
                  <p className="text-xs font-bold text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Row errors detected</p>
                  <ScrollArea className="max-h-20"><div className="text-[10px] text-red-400/80 ml-5">{parseErrors.map((err, i) => <div key={i}>{err}</div>)}</div></ScrollArea>
                </div>
              )}

              <ScrollArea className="max-h-[350px]">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-8">#</TableHead><TableHead>Task Title</TableHead><TableHead>Project</TableHead><TableHead>Assignees</TableHead><TableHead>Status</TableHead><TableHead>Results</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {parsedItems.map((t, idx) => (
                      <TableRow key={idx} className={!t._valid ? 'bg-red-500/5' : ''}>
                        <TableCell className="text-xs font-mono">{t._rowNum}</TableCell>
                        <TableCell className="text-xs font-bold">{t.title || <span className="text-red-400 italic">missing</span>}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-bold">{t.projectName}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground truncate max-w-[150px]">{t.assigneeEmails || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px]">{t.status || 'TODO'}</Badge></TableCell>
                        <TableCell>{t._valid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" title={t._errors.join(', ')} />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {step === STEPS.IMPORTING && (
            <div className="p-12 flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-lg font-bold">Importing {validCount} Tasks...</p>
            </div>
          )}

          {step === STEPS.RESULTS && importResults && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border bg-secondary/20 text-center"><p className="text-2xl font-black">{importResults.summary.total}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p></div>
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center"><p className="text-2xl font-black text-emerald-600">{importResults.summary.success}</p><p className="text-[10px] uppercase font-bold text-emerald-600/70">Imported</p></div>
                <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-center"><p className="text-2xl font-black text-red-500">{importResults.summary.failed}</p><p className="text-[10px] uppercase font-bold text-red-500/70">Failed</p></div>
              </div>
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-8">#</TableHead><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {importResults.results.map((r, idx) => (
                      <TableRow key={idx} className={r.status === 'FAILED' ? 'bg-red-500/5' : ''}>
                        <TableCell className="text-xs font-mono">{r.row}</TableCell>
                        <TableCell className="text-xs font-bold">{r.title}</TableCell>
                        <TableCell><Badge className={r.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'} variant="outline">{r.status}</Badge></TableCell>
                        <TableCell className="text-[11px] text-muted-foreground max-w-[250px] truncate">{r.error || 'Done'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0">
          {step === STEPS.PREVIEW && <Button variant="ghost" onClick={() => setStep(STEPS.INFO)} className="gap-2 text-xs font-bold"><ArrowLeft className="w-3.5 h-3.5" /> Back</Button>}
          <div className="flex-1" />
          {step === STEPS.PREVIEW && <Button onClick={handleImport} disabled={validCount === 0 || importing} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"><Upload className="w-4 h-4 mr-2" /> Import {validCount} Tasks</Button>}
          {step === STEPS.RESULTS && <Button onClick={() => handleClose(false)} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"><CheckCircle2 className="w-4 h-4 mr-2" /> Finish</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTasksDialog;
