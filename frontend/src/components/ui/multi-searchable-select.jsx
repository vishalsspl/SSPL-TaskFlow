import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Multi-select searchable dropdown.
 * @param {string[]} value - Array of selected values.
 * @param {(values: string[]) => void} onChange - Callback when selection changes.
 * @param {{ value: string; label: string }[]} options - The list of selectable options.
 */
export function MultiSearchableSelect({
    options = [],
    value = [],
    onChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    className,
    disabled = false,
}) {
    const [open, setOpen] = React.useState(false);

    const selectedLabels = React.useMemo(() =>
        options.filter((o) => value.includes(o.value)),
        [options, value]
    );

    const toggle = (optionValue) => {
        if (value.includes(optionValue)) {
            onChange(value.filter((v) => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    };

    const remove = (e, optionValue) => {
        e.stopPropagation();
        onChange(value.filter((v) => v !== optionValue));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal h-auto py-1.5",
                        !value.length && "text-muted-foreground/50",
                        className
                    )}
                >
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {selectedLabels.length > 0 ? (
                            selectedLabels.map((opt) => (
                                <Badge
                                    key={opt.value}
                                    variant="secondary"
                                    className="flex items-center gap-1 pr-1"
                                >
                                    {opt.label}
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => remove(e, opt.value)}
                                        onKeyDown={(e) => e.key === "Enter" && remove(e, opt.value)}
                                        className="rounded-full hover:bg-muted-foreground/20 cursor-pointer p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                </Badge>
                            ))
                        ) : (
                            <span className="truncate block w-full text-left">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={`${option.label}===${option.value}`}
                                    keywords={[option.label]}
                                    onSelect={() => toggle(option.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value.includes(option.value) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="truncate">{option.label}</span>
                                        {option.email && (
                                            <span className="text-[10px] text-muted-foreground/60 font-normal truncate">
                                                {option.email}
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
