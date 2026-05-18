
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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
    disabled = false,
    renderOption // Optional custom render function: (option) => ReactNode
}) {
    const [open, setOpen] = React.useState(false)

    // Find current option
    const selectedOption = React.useMemo(() => {
        return options.find((option) => option.value === value)
    }, [options, value])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal min-h-10 h-auto py-2", !value && "text-muted-foreground", className)}
                    disabled={disabled}
                >
                    <div className="flex items-center gap-2 truncate flex-1 text-left">
                        {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                        <span className="truncate">{selectedOption?.label || placeholder}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[400px] p-0" align="start">
                <Command filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1
                    return 0
                }}>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
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
                                    className="flex items-center gap-2"
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4 shrink-0",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
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
