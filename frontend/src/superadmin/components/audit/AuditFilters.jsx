import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Keep these options aligned with the action codes used in the audit log UI.
// (Matches the dropdown style shown in the screenshot.)
const ACTIONS = [
  { value: 'CREATED', label: 'CREATED' },
  { value: 'UPDATED', label: 'UPDATED' },
  { value: 'DELETED', label: 'DELETED' },
  { value: 'INVITED', label: 'INVITED' },
  { value: 'APPROVED', label: 'APPROVED' },
  { value: 'PASSWORD_RESET', label: 'PASSWORD_RESET' },
  { value: 'LOGGED_TIME', label: 'LOGGED_TIME' },
  { value: 'MESSAGE_SENT', label: 'MESSAGE_SENT' },
  { value: 'INTEGRATION_CONNECTED', label: 'CONNECTED' },
  { value: 'INTEGRATION_DISCONNECTED', label: 'DISCONNECTED' },
  { value: 'REPO_LINKED', label: 'REPO_LINKED' },
  { value: 'REPO_UNLINKED', label: 'REPO_UNLINKED' },
  { value: 'LOGIN_CLOCK_IN', label: 'USER LOGIN' },
];

const ENTITIES = [
  { value: 'user', label: 'Users' },
  { value: 'project', label: 'Projects' },
  { value: 'task', label: 'Tasks' },
  { value: 'integration', label: 'Integrations' },
  { value: 'organization', label: 'Organization' },
  { value: 'chat', label: 'Chats' },
  { value: 'time_entry', label: 'Time Tracking' },
];

const AuditFilters = ({ action, setAction, entity, setEntity, setPage, onExport, onSubmit }) => {
  const currentActionLabel = action
    ? (ACTIONS.find(a => a.value === action)?.label || action)
    : 'All Operations';
    
  const currentEntityLabel = entity
    ? (ENTITIES.find(e => e.value === entity)?.label || entity)
    : 'All Entities';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              className="h-14 w-full sm:min-w-[210px] sm:w-auto rounded-2xl bg-secondary/20 dark:bg-black/80 border border-border/10 dark:border-white/5 hover:bg-secondary/30 dark:hover:bg-black text-foreground dark:text-white flex items-center justify-between px-6 group transition-all"
            >
              <span className="text-sm font-bold tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">
                {currentActionLabel}
              </span>
              <ChevronsUpDown className="ml-4 h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[260px] p-2 rounded-2xl border-border/40 bg-background dark:bg-black shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl z-[100]"
          >
            <Command className="bg-transparent">
              <CommandInput placeholder="Search action..." className="placeholder:opacity-50 border-border/10 bg-secondary/10 rounded-xl mb-2" />
              <CommandList className="max-h-[300px] scrollbar-thin">
                <CommandEmpty className="py-6 text-center text-xs opacity-40 uppercase tracking-widest font-black">
                  No matches
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__all__"
                    onSelect={() => {
                      setAction('');
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-4 px-4 mb-1 transition-all",
                      !action ? "bg-[#48A111] text-white" : "hover:bg-secondary/40"
                    )}
                  >
                    <Check className={cn("mr-3 h-4 w-4", !action ? "opacity-100" : "opacity-0")} />
                    All Operations
                  </CommandItem>
                  {ACTIONS.map((a) => {
                    const selected = action === a.value;
                    return (
                      <CommandItem
                        key={a.value}
                        value={a.label}
                        onSelect={() => {
                          setAction(a.value);
                          setPage(1);
                        }}
                        className={cn(
                          "rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-4 px-4 mb-1 transition-all",
                          selected ? "bg-[#48A111] text-white" : "hover:bg-secondary/40"
                        )}
                      >
                        <Check className={cn("mr-3 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                        {a.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Entity Filter */}
        {setEntity && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                role="combobox"
                className="h-14 w-full sm:min-w-[210px] sm:w-auto rounded-2xl bg-secondary/20 dark:bg-black/80 border border-border/10 dark:border-white/5 hover:bg-secondary/30 dark:hover:bg-black text-foreground dark:text-white flex items-center justify-between px-6 group transition-all"
              >
                <span className="text-sm font-bold tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">
                  {currentEntityLabel}
                </span>
                <ChevronsUpDown className="ml-4 h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[260px] p-2 rounded-2xl border-border/40 bg-background dark:bg-black shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl z-[100]"
            >
              <Command className="bg-transparent">
                <CommandInput placeholder="Search entity..." className="placeholder:opacity-50 border-border/10 bg-secondary/10 rounded-xl mb-2" />
                <CommandList className="max-h-[300px] scrollbar-thin">
                  <CommandEmpty className="py-6 text-center text-xs opacity-40 uppercase tracking-widest font-black">
                    No matches
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__all__"
                      onSelect={() => {
                        setEntity('');
                        setPage(1);
                      }}
                      className={cn(
                        "rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-4 px-4 mb-1 transition-all",
                        !entity ? "bg-[#48A111] text-white" : "hover:bg-secondary/40"
                      )}
                    >
                      <Check className={cn("mr-3 h-4 w-4", !entity ? "opacity-100" : "opacity-0")} />
                      All Entities
                    </CommandItem>
                    {ENTITIES.map((e) => {
                      const selected = entity === e.value;
                      return (
                        <CommandItem
                          key={e.value}
                          value={e.label}
                          onSelect={() => {
                            setEntity(e.value);
                            setPage(1);
                          }}
                          className={cn(
                            "rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-4 px-4 mb-1 transition-all",
                            selected ? "bg-[#48A111] text-white" : "hover:bg-secondary/40"
                          )}
                        >
                          <Check className={cn("mr-3 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                          {e.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={onExport}
          className="h-14 w-full sm:w-auto rounded-2xl px-8 font-black text-xs tracking-tight bg-secondary/10 dark:bg-black border border-border/10 dark:border-white/5 hover:bg-secondary/20 dark:hover:bg-black/80 text-foreground dark:text-white flex items-center justify-center sm:justify-start gap-4 transition-all active:scale-[0.98] group"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Download className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          Export CSV
        </Button>
      </div>
    </div>
  );
};

export default AuditFilters;

