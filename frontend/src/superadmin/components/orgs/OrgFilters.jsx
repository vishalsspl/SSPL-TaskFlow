import { Button } from '@/components/ui/button';
import { Building2, ChevronDown } from 'lucide-react';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem,
 DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

const selectCls = 'h-11 rounded-xl border border-border/40 bg-background text-xs font-medium px-4 text-muted-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none pr-10 cursor-pointer';

const OrgFilters = ({
 statusFilter, setStatus,
 planFilter, setPlan,
 onProvision,
}) => {
 return (
 <div className="flex flex-col lg:flex-row items-center justify-between gap-4 w-full">
 {/* Filters and Button */}
 <div className="flex items-center justify-end gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap flex-1">
 {/* Status Filter */}
 <SearchableSelect
 value={statusFilter}
 onChange={setStatus}
 options={[
 { label: 'Status: All', value: '' },
 { label: 'ACTIVE', value: 'ACTIVE' },
 { label: 'TRIAL', value: 'TRIAL' },
 { label: 'SUSPENDED', value: 'SUSPENDED' },
 { label: 'CANCELLED', value: 'CANCELLED' }
 ]}
 placeholder="Status: All"
 searchPlaceholder="Search status..."
 className="w-full sm:w-44 h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all font-semibold"
 />

 {/* Plan Filter */}
 <SearchableSelect
 value={planFilter}
 onChange={setPlan}
 options={[
 { label: 'Plan: All', value: '' },
 { label: 'Free', value: 'FREE' },
 { label: 'Starter', value: 'STARTER' },
 { label: 'Pro', value: 'PRO' },
 { label: 'Enterprise', value: 'ENTERPRISE' }
 ]}
 placeholder="Plan: All"
 searchPlaceholder="Search plan..."
 className="w-full sm:w-44 h-11 rounded-xl bg-background border-border/40 hover:bg-accent/20 transition-all font-semibold"
 />

      <Button
        variant="outline"
        className="h-11 rounded-xl gap-3 font-bold text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all duration-300 w-full lg:w-auto px-6 border-primary/40 text-primary border-[1.5px] uppercase"
        onClick={onProvision}
      >
        <Building2 className="w-3.5 h-3.5" /> Add New
      </Button>
 </div>
 </div>
 );
};

export default OrgFilters;
