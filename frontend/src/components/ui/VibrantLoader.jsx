import React from 'react';
import { cn } from "@/lib/utils";

const VibrantLoader = ({ className, size = "md", text }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Core pulsing circle */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000" />
        
        {/* Rapid inner pulse */}
        <div className="absolute inset-2 rounded-full bg-primary/40 animate-pulse duration-700" />
        
        {/* Rotating branded outer ring */}
        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary/60 animate-spin transition-all" />
        
        {/* Static branded core */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary to-primary/80 shadow-[0_0_15px_rgba(72,161,17,0.4)] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
        </div>
      </div>
      
      {text && (
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 animate-pulse Montserrat">
          {text}
        </p>
      )}
    </div>
  );
};

export default VibrantLoader;
