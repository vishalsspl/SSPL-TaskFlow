import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, indicatorClassName, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-secondary/20",
            className
        )}
        {...props}
    >
        <div
            className={cn(
                "h-full w-full flex-1 bg-primary transition-all duration-500 ease-in-out",
                indicatorClassName
            )}
            style={{ width: `${value || 0}%` }}
        />
    </div>
))
Progress.displayName = "Progress"

export { Progress }
