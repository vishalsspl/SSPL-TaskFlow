import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  Users,
  FolderKanban,
  Calendar,
  Table2,
  BarChart3,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { generateTimesheetExcelReport } from '@/utils/timesheetExcelExport';

const SHEET_CONFIGS = [
  {
    key: 'overview',
    label: 'Overview & KPIs',
    description: 'Executive overview, high-level KPIs, and attendance metrics',
    icon: BarChart3,
  },
  {
    key: 'detailedLogs',
    label: 'Detailed Time Logs',
    description: 'Complete record of individual logs, tasks, and notes',
    icon: Table2,
  },
  {
    key: 'teamSummary',
    label: 'Team Member Summary',
    description: 'Aggregated hours, billable ratios, and user metrics',
    icon: Users,
  },
  {
    key: 'projectSummary',
    label: 'Project Summary',
    description: 'Hours allocated per project with task breakdown',
    icon: FolderKanban,
  },
  {
    key: 'dailyMatrix',
    label: 'Daily Hours Matrix',
    description: 'Calendar view of daily work hour distribution',
    icon: Calendar,
  },
];

const filterEntries = (rawList, memberId, projectId) => {
  if (!Array.isArray(rawList)) return [];
  return rawList.filter((entry) => {
    // Member Filter
    if (memberId && memberId !== 'all') {
      const entryUserId = String(entry.userId || entry.user?.id || entry.user || '');
      if (entryUserId !== String(memberId)) return false;
    }
    // Project Filter
    if (projectId && projectId !== 'all') {
      const entryProjectId = String(entry.projectId || entry.project?.id || entry.project || '');
      if (entryProjectId !== String(projectId)) return false;
    }
    return true;
  });
};

const formatDateRangeLabel = (range) => {
  if (!range?.from) return 'No range selected';
  const fromFormatted = format(new Date(range.from), 'MMM d, yyyy');
  if (!range.to) return fromFormatted;
  const toFormatted = format(new Date(range.to), 'MMM d, yyyy');
  return `${fromFormatted} – ${toFormatted}`;
};

const TimesheetExportModal = ({
  open = false,
  onOpenChange = () => {},
  entries = [],
  dateRange = {},
  orgName = '',
  users = [],
  projects = [],
  generatedBy = '',
  isAdmin = false,
}) => {
  const { toast } = useToast();

  // Filter States
  const [datePreset, setDatePreset] = useState('current');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  // Sheet Toggle States (all 5 ON by default)
  const [sheets, setSheets] = useState({
    overview: true,
    detailedLogs: true,
    teamSummary: true,
    projectSummary: true,
    dailyMatrix: true,
  });

  // Action and Preview States
  const [isExporting, setIsExporting] = useState(false);
  const [presetEntries, setPresetEntries] = useState(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  // Compute active date range based on selected preset
  const getActiveDateRange = useCallback(() => {
    if (datePreset === 'thisMonth') {
      const now = new Date();
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    }
    if (datePreset === 'lastMonth') {
      const prev = subMonths(new Date(), 1);
      return {
        from: startOfMonth(prev),
        to: endOfMonth(prev),
      };
    }
    // 'current' - uses passed dateRange prop as-is
    const from = dateRange?.from ? new Date(dateRange.from) : new Date();
    const to = dateRange?.to ? new Date(dateRange.to) : from;
    return { from, to };
  }, [datePreset, dateRange]);

  const activeDateRange = useMemo(() => getActiveDateRange(), [getActiveDateRange]);

  // Fetch fresh data for preview when user switches to 'thisMonth' or 'lastMonth'
  useEffect(() => {
    if (!open) return;

    if (datePreset === 'current') {
      setPresetEntries(null);
      return;
    }

    let isMounted = true;
    const fetchPresetData = async () => {
      try {
        setIsFetchingPreview(true);
        const range = getActiveDateRange();
        const startD = new Date(range.from);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(range.to);
        endD.setHours(23, 59, 59, 999);

        const response = await api.get(
          `/timesheets?startDate=${startD.toISOString()}&endDate=${endD.toISOString()}`
        );
        const data = response.data?.entries || response.data?.data || (Array.isArray(response.data) ? response.data : []);
        if (isMounted) {
          setPresetEntries(data);
        }
      } catch (err) {
        console.error('Failed to fetch preview entries:', err);
      } finally {
        if (isMounted) {
          setIsFetchingPreview(false);
        }
      }
    };

    fetchPresetData();

    return () => {
      isMounted = false;
    };
  }, [open, datePreset, getActiveDateRange]);

  // Reset or initialize filters when modal opens
  useEffect(() => {
    if (open) {
      setDatePreset('current');
      setSelectedMember('all');
      setSelectedProject('all');
      setPresetEntries(null);
      setIsExporting(false);
    }
  }, [open]);

  // Preview stats computation
  const previewStats = useMemo(() => {
    const sourceEntries = datePreset === 'current' ? entries : (presetEntries || []);
    const filtered = filterEntries(sourceEntries, selectedMember, selectedProject);

    const entriesCount = filtered.length;

    const uniqueMemberIds = new Set(
      filtered
        .map((e) => String(e.userId || e.user?.id || e.user || ''))
        .filter(Boolean)
    );
    let membersCount = uniqueMemberIds.size;
    if (membersCount === 0 && selectedMember !== 'all' && entriesCount > 0) {
      membersCount = 1;
    }

    const start = new Date(activeDateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(activeDateRange.to);
    end.setHours(0, 0, 0, 0);
    const daysCount = Math.max(1, Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return {
      entriesCount,
      membersCount,
      daysCount,
    };
  }, [activeDateRange, datePreset, entries, presetEntries, selectedMember, selectedProject]);

  // Handle Export Download
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const activeRange = getActiveDateRange();

      let targetEntries = entries;

      // If dateRange preset is not 'current', fetch fresh data from API for the selected period
      if (datePreset !== 'current') {
        const startD = new Date(activeRange.from);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(activeRange.to);
        endD.setHours(23, 59, 59, 999);

        const response = await api.get(
          `/timesheets?startDate=${startD.toISOString()}&endDate=${endD.toISOString()}`
        );
        targetEntries =
          response.data?.entries ||
          response.data?.data ||
          (Array.isArray(response.data) ? response.data : []);
      }

      // Filter entries based on selected member and project
      const filteredEntries = filterEntries(targetEntries, selectedMember, selectedProject);

      // Call report generator
      await generateTimesheetExcelReport({
        entries: filteredEntries,
        dateRange: activeRange,
        orgName: orgName || 'Organization',
        users: users || [],
        projects: projects || [],
        generatedBy: generatedBy || 'User',
        sheets,
      });

      toast({
        title: 'Report Generated',
        description: 'Timesheet Excel workbook has been exported successfully.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Timesheet export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Failed to export timesheet report. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto bg-card/95 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-foreground">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-border/40 text-left">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Export Timesheet Report
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-emerald-500/30 text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md"
                >
                  Excel (.xlsx)
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure your filters and select worksheets to generate a detailed report.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Section */}
        <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3.5`}>
          {/* Date Range Preset */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Date Range
            </Label>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="rounded-xl font-medium bg-muted/20 border-border/60 hover:border-primary/50 focus:ring-1 focus:ring-primary h-10 transition-colors">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card">
                <SelectItem value="current" className="cursor-pointer font-medium">
                  Current Timeline
                </SelectItem>
                <SelectItem value="thisMonth" className="cursor-pointer font-medium">
                  This Month
                </SelectItem>
                <SelectItem value="lastMonth" className="cursor-pointer font-medium">
                  Last Month
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/80 pl-0.5 truncate font-medium">
              {formatDateRangeLabel(activeDateRange)}
            </p>
          </div>

          {/* Member Filter (Admin only) */}
          {isAdmin && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Member Filter
              </Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="rounded-xl font-medium bg-muted/20 border-border/60 hover:border-primary/50 focus:ring-1 focus:ring-primary h-10 transition-colors">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-card max-h-56">
                  <SelectItem value="all" className="cursor-pointer font-medium">
                    All Members
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem
                      key={u.id}
                      value={String(u.id)}
                      className="cursor-pointer font-medium"
                    >
                      {u.name || u.email || `Member #${u.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground/80 pl-0.5 truncate font-medium">
                {selectedMember === 'all'
                  ? 'All team members'
                  : users.find((u) => String(u.id) === selectedMember)?.name || '1 member selected'}
              </p>
            </div>
          )}

          {/* Project Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-primary" /> Project Filter
            </Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="rounded-xl font-medium bg-muted/20 border-border/60 hover:border-primary/50 focus:ring-1 focus:ring-primary h-10 transition-colors">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card max-h-56">
                <SelectItem value="all" className="cursor-pointer font-medium">
                  All Projects
                </SelectItem>
                {projects.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={String(p.id)}
                    className="cursor-pointer font-medium"
                  >
                    {p.name || `Project #${p.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/80 pl-0.5 truncate font-medium">
              {selectedProject === 'all'
                ? 'All projects'
                : projects.find((p) => String(p.id) === selectedProject)?.name || '1 project selected'}
            </p>
          </div>
        </div>

        {/* Sheets to Include */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Sheets to Include
            </Label>
            <Badge
              variant="secondary"
              className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md"
            >
              5 Worksheets
            </Badge>
          </div>
          <div className="space-y-2 border border-border/40 bg-muted/20 rounded-2xl p-3">
            {SHEET_CONFIGS.map((sheet) => {
              const Icon = sheet.icon;
              return (
                <div
                  key={sheet.key}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-xl hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">
                        {sheet.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {sheet.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={sheets[sheet.key]}
                    onCheckedChange={(checked) =>
                      setSheets((prev) => ({ ...prev, [sheet.key]: checked }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview Summary */}
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3.5 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {isFetchingPreview ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                Updating export preview metrics...
              </span>
            ) : (
              <span>
                <strong className="text-foreground font-bold">{previewStats.entriesCount}</strong>{' '}
                {previewStats.entriesCount === 1 ? 'entry' : 'entries'} across{' '}
                <strong className="text-foreground font-bold">{previewStats.membersCount}</strong>{' '}
                {previewStats.membersCount === 1 ? 'member' : 'members'} for{' '}
                <strong className="text-foreground font-bold">{previewStats.daysCount}</strong>{' '}
                {previewStats.daysCount === 1 ? 'day' : 'days'} will be exported
              </span>
            )}
          </div>
        </div>

        {/* Footer / Download Button */}
        <DialogFooter className="pt-1 sm:pt-2">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 text-sm shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.99]"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Excel Report...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel (.xlsx)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimesheetExportModal;
