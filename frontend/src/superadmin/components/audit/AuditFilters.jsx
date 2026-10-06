import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

const ACTIONS = [
  { value: 'CREATED', label: 'CREATED' },
  { value: 'UPDATED', label: 'UPDATED' },
  { value: 'DELETED', label: 'DELETED' },
  { value: 'DOCUMENT_UPLOADED', label: 'DOCUMENT_UPLOADED' },
  { value: 'DOCUMENT_UPDATED', label: 'DOCUMENT_UPDATED' },
  { value: 'DOCUMENT_DELETED', label: 'DOCUMENT_DELETED' },
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
  { value: 'document', label: 'Documents' },
  { value: 'integration', label: 'Integrations' },
  { value: 'organization', label: 'Organization' },
  { value: 'chat', label: 'Chats' },
  { value: 'time_entry', label: 'Time Tracking' },
];

// Conditional mapping: Action -> Compatible Entities
const ACTION_ENTITY_MAP = {
  APPROVED: ['task', 'time_entry', 'user'],
  DOCUMENT_UPLOADED: ['document'],
  DOCUMENT_UPDATED: ['document'],
  DOCUMENT_DELETED: ['document'],
  INVITED: ['user'],
  PASSWORD_RESET: ['user'],
  LOGGED_TIME: ['time_entry', 'task'],
  MESSAGE_SENT: ['chat'],
  INTEGRATION_CONNECTED: ['integration'],
  INTEGRATION_DISCONNECTED: ['integration'],
  REPO_LINKED: ['project', 'integration'],
  REPO_UNLINKED: ['project', 'integration'],
  LOGIN_CLOCK_IN: ['user'],
};

// Conditional mapping: Entity -> Compatible Actions
const ENTITY_ACTION_MAP = {
  user: ['CREATED', 'UPDATED', 'DELETED', 'INVITED', 'PASSWORD_RESET', 'LOGIN_CLOCK_IN', 'APPROVED'],
  project: ['CREATED', 'UPDATED', 'DELETED', 'REPO_LINKED', 'REPO_UNLINKED'],
  task: ['CREATED', 'UPDATED', 'DELETED', 'APPROVED', 'LOGGED_TIME'],
  document: ['DOCUMENT_UPLOADED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'CREATED', 'UPDATED', 'DELETED'],
  integration: ['INTEGRATION_CONNECTED', 'INTEGRATION_DISCONNECTED', 'REPO_LINKED', 'REPO_UNLINKED'],
  organization: ['CREATED', 'UPDATED'],
  chat: ['MESSAGE_SENT'],
  time_entry: ['LOGGED_TIME', 'APPROVED'],
};

const AuditFilters = ({ action, setAction, entity, setEntity, setPage, onExport }) => {
  const [actionOpen, setActionOpen] = useState(false);
  const [entityOpen, setEntityOpen] = useState(false);

  // Filter available entities based on selected action
  const availableEntities = action && ACTION_ENTITY_MAP[action]
    ? ENTITIES.filter(e => ACTION_ENTITY_MAP[action].includes(e.value))
    : ENTITIES;

  // Filter available actions based on selected entity
  const availableActions = entity && ENTITY_ACTION_MAP[entity]
    ? ACTIONS.filter(a => ENTITY_ACTION_MAP[entity].includes(a.value))
    : ACTIONS;

  const currentActionLabel = action
    ? (ACTIONS.find(a => a.value === action)?.label || action)
    : 'All Operations';
    
  const currentEntityLabel = entity
    ? (ENTITIES.find(e => e.value === entity)?.label || entity)
    : 'All Entities';

  const handleSelectAction = (newAction) => {
    setAction(newAction);
    setPage(1);
    setActionOpen(false);

    // If new action makes current entity invalid, reset entity
    if (newAction && setEntity && entity && ACTION_ENTITY_MAP[newAction]) {
      if (!ACTION_ENTITY_MAP[newAction].includes(entity)) {
        setEntity('');
      }
    }
  };

  const handleSelectEntity = (newEntity) => {
    if (!setEntity) return;
    setEntity(newEntity);
    setPage(1);
    setEntityOpen(false);

    // If new entity makes current action invalid, reset action
    if (newEntity && action && ENTITY_ACTION_MAP[newEntity]) {
      if (!ENTITY_ACTION_MAP[newEntity].includes(action)) {
        setAction('');
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        <Popover open={actionOpen} onOpenChange={setActionOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              className="h-14 w-full sm:min-w-[210px] sm:w-auto rounded-2xl bg-background border hover:bg-accent/20 text-foreground dark:text-white flex items-center justify-between px-6 group transition-all"
              style={{ borderColor: 'var(--input-border)' }}
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
                    onSelect={() => handleSelectAction('')}
                    className={cn(
                      "rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-4 px-4 mb-1 transition-all",
                      !action ? "bg-[#48A111] text-white" : "hover:bg-secondary/40"
                    )}
                  >
                    <Check className={cn("mr-3 h-4 w-4", !action ? "opacity-100" : "opacity-0")} />
                    All Operations
                  </CommandItem>
                  {availableActions.map((a) => {
                    const selected = action === a.value;
                    return (
                      <CommandItem
                        key={a.value}
                        value={a.label}
                        onSelect={() => handleSelectAction(a.value)}
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
          <Popover open={entityOpen} onOpenChange={setEntityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                role="combobox"
                className="h-14 w-full sm:min-w-[210px] sm:w-auto rounded-2xl bg-background border hover:bg-accent/20 text-foreground dark:text-white flex items-center justify-between px-6 group transition-all"
                style={{ borderColor: 'var(--input-border)' }}
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
                      onSelect={() => handleSelectEntity('')}
                      className={cn(
                        "rounded-xl cursor-pointer font-bold text-[10px] tracking-widest uppercase py-4 px-4 mb-1 transition-all",
                        !entity ? "bg-[#48A111] text-white" : "hover:bg-secondary/40"
                      )}
                    >
                      <Check className={cn("mr-3 h-4 w-4", !entity ? "opacity-100" : "opacity-0")} />
                      All Entities
                    </CommandItem>
                    {availableEntities.map((e) => {
                      const selected = entity === e.value;
                      return (
                        <CommandItem
                          key={e.value}
                          value={e.label}
                          onSelect={() => handleSelectEntity(e.value)}
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
          className="h-14 w-full sm:w-auto rounded-2xl px-8 font-black text-xs tracking-tight bg-background border hover:bg-accent/20 text-foreground dark:text-white flex items-center justify-center sm:justify-start gap-4 transition-all active:scale-[0.98] group"
          style={{ borderColor: 'var(--input-border)' }}
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
