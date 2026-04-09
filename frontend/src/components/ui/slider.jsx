import React from 'react';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef(({ className, min = 1, max = 500, value, onChange, ...props }, ref) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center group", className)} ref={ref}>
      {/* Track Background */}
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#48A111]/10">
        {/* Active Track (Fill) */}
        <div 
          className="absolute h-full bg-gradient-to-r from-[#48A111] to-[#A3E635] transition-all duration-300 ease-out" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Hidden Native Input (for accessibility and touch) */}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="absolute inset-0 z-20 w-full h-full opacity-0 cursor-pointer"
        {...props}
      />

      {/* Custom Thumb */}
      <div 
        className="absolute z-10 size-5 rounded-full border-2 border-[#48A111] bg-white shadow-lg transition-all duration-300 ease-out pointer-events-none group-hover:scale-110 group-active:scale-95"
        style={{ left: `calc(${percentage}% - 10px)` }}
      >
        <div className="absolute inset-0 rounded-full bg-[#48A111]/20 animate-pulse" />
      </div>
    </div>
  );
});

Slider.displayName = "Slider";

export { Slider };
