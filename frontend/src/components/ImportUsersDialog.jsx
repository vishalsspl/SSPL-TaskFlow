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
  FileUp, Loader2, Info, ArrowLeft, Sparkles, X,
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Name', description: 'Full name (letters, numbers, spaces only)', example: 'John Doe', required: true },
  { key: 'email', label: 'Email', description: 'Valid email address (must be unique)', example: 'john@company.com', required: true },
  { key: 'role', label: 'Role', description: 'MANAGER, MEMBER, or CLIENT', example: 'MEMBER', required: true },
  { key: 'password', label: 'Password', description: 'Initial password (auto-generated if empty)', example: 'Pass@123', required: false },
];

const STEPS = {
  INFO: 'info',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  RESULTS: 'results',
};

const ImportUsersDialog = ({ open, onOpenChange, onImportComplete }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(STEPS.INFO);
  const [parsedUsers, setParsedUsers] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');

  const resetState = () => {
    setStep(STEPS.INFO);
    setParsedUsers([]);
    setParseErrors([]);
    setImportResults(null);
    setImporting(false);
    setFileName('');
  };

  const handleClose = (val) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  // ── Download Sample Template ──
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      { Name: 'John Doe', Email: 'john@company.com', Role: 'MEMBER', Password: 'Pass@123' },
      { Name: 'Jane Smith', Email: 'jane@company.com', Role: 'MANAGER', Password: '' },
      { Name: 'Bob Client', Email: 'bob@client.com', Role: 'CLIENT', Password: 'Secure456' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'TaskFlow_Import_Template.xlsx');
  };

  // ── Parse Excel File ──
  const parseFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonData.length === 0) {
          setParseErrors(['The spreadsheet is empty. Please add user data and try again.']);
          return;
        }

        // Normalize column headers (case-insensitive mapping)
        const normalizedData = jsonData.map((row, idx) => {
          const normalized = {};
          const keys = Object.keys(row);

          // Map common header variations
          for (const key of keys) {
            const k = key.toLowerCase().trim();
            if (k === 'name' || k === 'full name' || k === 'fullname' || k === 'user name' || k === 'username') {
              normalized.name = String(row[key]).trim();
            } else if (k === 'email' || k === 'email address' || k === 'emailaddress' || k === 'e-mail') {
              normalized.email = String(row[key]).trim();
            } else if (k === 'role' || k === 'user role' || k === 'userrole' || k === 'type') {
              normalized.role = String(row[key]).toUpperCase().trim();
            } else if (k === 'password' || k === 'pass' || k === 'initial password') {
              normalized.password = String(row[key]).trim();
            }
          }

          return normalized;
        });

        // Validate
        const errors = [];
        const validUsers = [];

        normalizedData.forEach((user, idx) => {
          const rowErrors = [];

          if (!user.name) rowErrors.push('Missing name');
          else if (!/^[a-zA-Z0-9\s]+$/.test(user.name)) rowErrors.push('Name has special characters');

          if (!user.email) rowErrors.push('Missing email');
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) rowErrors.push('Invalid email');

          if (!user.role) rowErrors.push('Missing role');
          else if (!['MANAGER', 'MEMBER', 'CLIENT'].includes(user.role)) rowErrors.push(`Invalid role "${user.role}"`);

          if (rowErrors.length > 0) {
            errors.push(`Row ${idx + 2}: ${rowErrors.join(', ')}`);
          }

          validUsers.push({
            ...user,
            _rowNum: idx + 2,
            _valid: rowErrors.length === 0,
            _errors: rowErrors,
          });
        });

        setParsedUsers(validUsers);
        setParseErrors(errors);
        setStep(STEPS.PREVIEW);
      } catch (err) {
        setParseErrors([`Failed to parse file: ${err.message}`]);
        toast({ title: 'Parse Error', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      parseFile(file);
    } else {
      toast({ title: 'Invalid File', description: 'Please upload an .xlsx, .xls, or .csv file.', variant: 'destructive' });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
  };

  // ── Import Users ──
  const handleImport = async () => {
    const validUsers = parsedUsers.filter(u => u._valid).map(({ _rowNum, _valid, _errors, ...user }) => user);
    if (validUsers.length === 0) {
      toast({ title: 'No valid users', description: 'Fix the errors in your spreadsheet and try again.', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setStep(STEPS.IMPORTING);

    try {
      const res = await api.post('/auth/bulk-invite', { users: validUsers });
      setImportResults(res.data);
      setStep(STEPS.RESULTS);
      if (res.data.summary.success > 0) {
        onImportComplete?.();
      }
    } catch (err) {
      toast({ title: 'Import Failed', description: err.response?.data?.error || err.message, variant: 'destructive' });
      setStep(STEPS.PREVIEW);
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedUsers.filter(u => u._valid).length;
  const invalidCount = parsedUsers.filter(u => !u._valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-lg font-bold tracking-tight">
                {step === STEPS.INFO && 'Import Users from Excel'}
                {step === STEPS.PREVIEW && 'Preview Import Data'}
                {step === STEPS.IMPORTING && 'Importing Users...'}
                {step === STEPS.RESULTS && 'Import Results'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {step === STEPS.INFO && 'Upload a spreadsheet to bulk-add team members'}
                {step === STEPS.PREVIEW && `${validCount} valid, ${invalidCount} with errors — from ${fileName}`}
                {step === STEPS.IMPORTING && 'Please wait while users are being created...'}
                {step === STEPS.RESULTS && importResults?.message}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── STEP 1: INFO & UPLOAD ── */}
          {step === STEPS.INFO && (
            <div className="p-6 space-y-6">
              {/* Required Fields Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <Info className="w-3.5 h-3.5" />
                  Required Spreadsheet Columns
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REQUIRED_FIELDS.map(field => (
                    <div key={field.key} className="p-4 rounded-2xl border border-border/40 bg-secondary/20 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{field.label}</span>
                        {field.required ? (
                          <Badge className="text-[8px] px-1.5 py-0 bg-red-500/10 text-red-500 border-red-500/20 font-black">REQUIRED</Badge>
                        ) : (
                          <Badge className="text-[8px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border/30 font-black">OPTIONAL</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{field.description}</p>
                      <code className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded-md font-bold">e.g. {field.example}</code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Template */}
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full h-12 rounded-xl border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs tracking-wider uppercase gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Sample Excel Template
              </Button>

              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
                  dragOver
                    ? 'border-primary bg-primary/10 scale-[1.02]'
                    : 'border-border/40 bg-secondary/10 hover:border-primary/40 hover:bg-secondary/20'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileUp className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Drop your Excel file here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse — supports .xlsx, .xls, .csv</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: PREVIEW ── */}
          {step === STEPS.PREVIEW && (
            <div className="p-6 space-y-4">
              {/* Summary Bar */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-bold text-foreground">{parsedUsers.length} rows found</span>
                </div>
                <div className="flex-1" />
                {validCount > 0 && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {validCount} valid
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs font-bold gap-1">
                    <XCircle className="w-3 h-3" /> {invalidCount} errors
                  </Badge>
                )}
              </div>

              {/* Error Messages */}
              {parseErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
                  <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {parseErrors.length} issue(s) found:
                  </p>
                  <ScrollArea className="max-h-24">
                    {parseErrors.map((err, i) => (
                      <p key={i} className="text-[11px] text-red-400/80 ml-5">{err}</p>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Data Preview Table */}
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/20">
                      <TableHead className="text-[10px] uppercase tracking-widest w-12">#</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest">Name</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest">Email</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest">Role</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest w-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.map((user, idx) => (
                      <TableRow key={idx} className={`border-border/10 ${!user._valid ? 'bg-red-500/5' : ''}`}>
                        <TableCell className="text-xs text-muted-foreground font-mono">{user._rowNum}</TableCell>
                        <TableCell className="text-xs font-medium">{user.name || <span className="text-red-400 italic">empty</span>}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{user.email || <span className="text-red-400 italic">empty</span>}</TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge variant="outline" className="text-[10px] font-bold">{user.role}</Badge>
                          ) : (
                            <span className="text-red-400 italic text-xs">empty</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user._valid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                              <span className="text-[10px] text-red-400 truncate max-w-[80px]" title={user._errors.join(', ')}>
                                {user._errors[0]}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* ── STEP 3: IMPORTING ── */}
          {step === STEPS.IMPORTING && (
            <div className="p-12 flex flex-col items-center justify-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center animate-pulse">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">Creating {validCount} users...</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment. Don't close this dialog.</p>
              </div>
            </div>
          )}

          {/* ── STEP 4: RESULTS ── */}
          {step === STEPS.RESULTS && importResults && (
            <div className="p-6 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-border/30 bg-secondary/20 text-center">
                  <p className="text-2xl font-black text-foreground">{importResults.summary.total}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Total</p>
                </div>
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                  <p className="text-2xl font-black text-emerald-600">{importResults.summary.success}</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-600/70 font-bold mt-1">Imported</p>
                </div>
                <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
                  <p className="text-2xl font-black text-red-500">{importResults.summary.failed}</p>
                  <p className="text-[10px] uppercase tracking-widest text-red-500/70 font-bold mt-1">Failed</p>
                </div>
              </div>

              {/* Per-row Results */}
              <ScrollArea className="max-h-[250px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/20">
                      <TableHead className="text-[10px] uppercase tracking-widest w-12">#</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest">Email</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-widest">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.results.map((r, idx) => (
                      <TableRow key={idx} className={`border-border/10 ${r.status === 'FAILED' ? 'bg-red-500/5' : ''}`}>
                        <TableCell className="text-xs text-muted-foreground font-mono">{r.row}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{r.email}</TableCell>
                        <TableCell>
                          {r.status === 'SUCCESS' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Success
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold gap-1">
                              <XCircle className="w-3 h-3" /> Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground max-w-[200px] truncate" title={r.error || `${r.name} (${r.role})`}>
                          {r.status === 'SUCCESS' ? `${r.name} — ${r.role}` : r.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-border/40 flex items-center justify-between shrink-0 gap-3">
          {step === STEPS.INFO && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">
              <Upload className="w-3 h-3" /> Supports up to 100 users per import
            </div>
          )}

          {step === STEPS.PREVIEW && (
            <Button variant="ghost" onClick={() => { resetState(); }} className="gap-2 text-xs font-bold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          )}

          {step === STEPS.RESULTS && (
            <Button variant="ghost" onClick={() => handleClose(false)} className="gap-2 text-xs font-bold">
              <X className="w-3.5 h-3.5" /> Close
            </Button>
          )}

          <div className="flex-1" />

          {step === STEPS.PREVIEW && (
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || importing}
              className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider uppercase gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              Import {validCount} User{validCount !== 1 ? 's' : ''}
            </Button>
          )}

          {step === STEPS.RESULTS && (
            <Button
              onClick={() => handleClose(false)}
              className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider uppercase gap-2 shadow-lg shadow-primary/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportUsersDialog;
