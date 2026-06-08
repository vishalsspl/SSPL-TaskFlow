import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}) {
    const currentYear = new Date().getFullYear();

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            fixedWeeks={true}
            captionLayout="dropdown-buttons"
            fromYear={currentYear}
            toYear={currentYear + 5}
            className={cn("p-3 border shadow-sm rounded-xl bg-card text-foreground font-['Montserrat'] w-fit", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-3 sm:space-x-3 sm:space-y-0",
                month: "space-y-3",
                caption: "flex justify-center pt-1 relative items-center mb-2",
                caption_label: "hidden",
                caption_dropdowns: "flex justify-center gap-1 items-center",
                dropdown: "appearance-none bg-transparent cursor-pointer hover:bg-accent hover:text-accent-foreground px-1 py-0.5 rounded text-xs font-bold uppercase tracking-wider outline-none",
                dropdown_month: "ml-1",
                dropdown_year: "ml-1",
                dropdown_icon: "hidden",
                nav: "space-x-1 flex items-center bg-muted/50 rounded-lg p-1",
                nav_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-6 w-6 bg-transparent p-0 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1 mt-1",
                head_row: "flex w-full mb-1 space-x-1",
                head_cell:
                    "text-muted-foreground font-black text-[10px] w-8 font-normal uppercase tracking-wider text-center",
                row: "flex w-full mt-1 space-x-1",
                cell: "h-8 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 font-semibold text-foreground hover:bg-primary/20 hover:text-primary transition-all rounded-lg text-xs"
                ),
                day_range_end: "day-range-end",
                day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] font-black",
                day_today: "bg-accent text-accent-foreground font-bold border border-primary/20",
                day_outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                Dropdown: ({ value, onChange, children, ...props }) => {
                    const options = React.Children.toArray(children)
                    const selected = options.find((child) => child.props.value === value)
                    const handleChange = (newVal) => {
                        const changeEvent = {
                            target: { 
                                value: newVal,
                                name: props.name
                            }
                        }
                        onChange?.(changeEvent)
                    }

                    return (
                        <Select
                            value={value?.toString()}
                            onValueChange={handleChange}
                        >
                            <SelectTrigger className="h-7 px-2 py-0 border-none bg-transparent hover:bg-accent font-bold uppercase tracking-wider text-xs focus:ring-0 w-auto gap-1">
                                <SelectValue>{selected?.props?.children}</SelectValue>
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[200px]">
                                {options.map((option, id) => (
                                    <SelectItem key={`${option.props.value}-${id}`} value={option.props.value?.toString() || ""}>
                                        {option.props.children}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
