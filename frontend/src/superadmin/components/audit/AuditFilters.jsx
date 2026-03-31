import { Button } from '@/components/ui/button';
import { Download, ChevronDown } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

const AuditFilters = ({
  action, setAction,
  setPage,
  onSubmit,
  onExport,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white/40 dark:bg-black/40 p-6 rounded-xl border border-border/40 backdrop-blur-3xl shadow-2xl shadow-primary/5"
    >
      <div className="flex flex-wrap items-center gap-4 w-full">
        {/* Action Filter */}
        <div className="relative min-w-[180px] flex-1 sm:flex-none">
          <SearchableSelect
            value={action}
            onChange={(val) => { setAction(val); setPage(1); }}
            options={[
              { label: 'All Operations', value: '' },
              { label: 'CREATED', value: 'CREATED' },
              { label: 'UPDATED', value: 'UPDATED' },
              { label: 'DELETED', value: 'DELETED' },
              { label: 'INVITED', value: 'INVITED' },
              { label: 'APPROVED', value: 'APPROVED' },
              { label: 'LOGGED_TIME', value: 'LOGGED_TIME' },
              { label: 'PASSWORD_RESET', value: 'PASSWORD_RESET' }
            ]}
            placeholder="All Operations"
            searchPlaceholder="Search action..."
            className="w-full h-14 rounded-lg bg-white/50 dark:bg-black/50 border-border/40 hover:bg-accent/20 transition-all font-semibold"
          />
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="h-14 rounded-lg gap-3 font-semibold text-sm tracking-widest border-border/40 px-8 hover:bg-primary/5 transition-all w-full sm:w-auto"
          onClick={onExport}
        >
          <Download className="w-5 h-5 text-primary" />
          Export CSV
        </Button>
      </div>
    </form>
  );
};

export default AuditFilters;
