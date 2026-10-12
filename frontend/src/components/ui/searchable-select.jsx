
import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    className,
    style,
    disabled = false,
    renderOption, // Optional custom render function: (option) => ReactNode
    onAddClick,
    addLabel = "Add New",
    ...props
}) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    // Find current option
    const selectedOption = React.useMemo(() => {
        return options.find((option) => option.value === value)
    }, [options, value])

    const handleOpenChange = (isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setSearch("")
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal min-h-10 h-auto py-2 px-2.5 text-xs", !value && "text-muted-foreground/50", className)}
                    style={style}
                    disabled={disabled}
                    {...props}
                >
                    <div className="flex items-center gap-2 truncate flex-1 text-left">
                        {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                        <span className="truncate">{selectedOption?.label || placeholder}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1
                    return 0
                }}>
                    <div className="relative flex items-center">
                        <CommandInput
                            placeholder={searchPlaceholder}
                            className="pr-10"
                            value={search}
                            onValueChange={setSearch}
                        />
                        {onAddClick && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const currentSearch = search;
                                    setOpen(false);
                                    onAddClick(currentSearch);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors z-10 cursor-pointer"
                                title={addLabel}
                                aria-label={addLabel}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <CommandList className="max-h-[200px]">
                        <CommandEmpty>
                            {onAddClick ? (
                                <div className="py-2.5 px-3 text-center space-y-2">
                                    <p className="text-muted-foreground text-xs">{emptyMessage}</p>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const currentSearch = search;
                                            setOpen(false);
                                            onAddClick(currentSearch);
                                        }}
                                        className="w-full text-xs py-1.5 px-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Create &ldquo;{search || addLabel}&rdquo;</span>
                                    </button>
                                </div>
                            ) : (
                                emptyMessage
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={`${option.label}===${option.value}`}
                                    keywords={[option.label]}
                                    onSelect={() => {
                                        onChange(option.value)
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 text-xs",
                                        value === option.value && "font-bold text-primary bg-primary/5"
                                    )}
                                >
                                    {renderOption ? renderOption(option) : (
                                        <div className="flex items-center gap-2">
                                            {option.icon && <span className="shrink-0">{option.icon}</span>}
                                            <span className="whitespace-normal break-words">{option.label}</span>
                                        </div>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
