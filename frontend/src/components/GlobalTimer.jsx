import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Timer as TimerIcon, X, Check } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const GlobalTimer = () => {
  const {
    activeTaskId,
    activeTaskTitle,
    activeProjectId,
    isRunning,
    description,
    pauseTimer,
    resumeTimer,
    resetTimer,
    updateDescription,
    saveWorklog,
    getCurrentElapsed,
    isRecorderOpen,
    setRecorderOpen,
    syncUser
  } = useTimerStore();

  const { user } = useAuthStore();
  const { toast } = useToast();
  const [displayTime, setDisplayTime] = useState(0);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Sync user state to isolate timer
  useEffect(() => {
    if (user?.id) {
      syncUser(user.id);
    }
  }, [user?.id, syncUser]);

  // Update display time every second
  useEffect(() => {
    let interval;
    if (activeTaskId && isRunning) {
      setDisplayTime(getCurrentElapsed());
      interval = setInterval(() => {
        setDisplayTime(getCurrentElapsed());
      }, 1000);
    } else if (activeTaskId) {
      setDisplayTime(getCurrentElapsed());
    }
    return () => clearInterval(interval);
  }, [activeTaskId, isRunning, getCurrentElapsed]);

  if (user?.role === 'CLIENT' || !activeTaskId || !isRecorderOpen) return null;

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopAndSave = () => {
    if (displayTime < 60) {
      toast({
        title: "Session too short",
        description: "Please track at least 1 minute before saving.",
        variant: "destructive"
      });
      return;
    }
    setShowSaveConfirm(true);
  };

  const onConfirmSave = async () => {
    const result = await saveWorklog();
    if (result.success) {
      toast({
        title: "Worklog saved",
        description: `Successfully logged ${(displayTime / 3600).toFixed(2)} hours.`
      });
      setShowSaveConfirm(false);
      setRecorderOpen(false);
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const onDiscard = () => {
    resetTimer();
    setShowSaveConfirm(false);
    setRecorderOpen(false);
    toast({
      title: "Session discarded",
      description: "The time tracking session has been cleared."
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => !showSaveConfirm && setRecorderOpen(false)}
      />
      
      {/* Modal */}
      <Card 
        className={cn(
          "relative w-full max-w-[400px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]",
          "bg-[#0F1115]/95 backdrop-blur-2xl border-white/10 ring-1 ring-white/5 rounded-[2.5rem]",
          "animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-out"
        )}
      >
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary Montserrat">Current Session</span>
              <h2 className="text-xl font-bold text-white Montserrat truncate pr-4">{activeTaskTitle}</h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setRecorderOpen(false)}
              className="rounded-full bg-white/5 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="px-8 pb-10 space-y-8">
            {/* Timer Display */}
            <div className="flex flex-col items-center justify-center py-6 bg-white/5 rounded-[2rem] border border-white/5">
               <div className="relative">
                  <span className="text-6xl font-mono font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(72,161,17,0.4)]">
                    {formatTime(displayTime)}
                  </span>
                  {isRunning && <span className="absolute -right-6 top-2 w-3 h-3 bg-primary rounded-full animate-ping" />}
               </div>
               
               <div className="flex items-center gap-4 mt-6">
                {isRunning ? (
                  <Button 
                    onClick={pauseTimer}
                    className="rounded-full bg-white/10 text-white hover:bg-white/20 h-14 w-14 group"
                  >
                    <Pause className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                  </Button>
                ) : (
                  <Button 
                    onClick={resumeTimer}
                    className="rounded-full bg-primary text-white hover:bg-primary/90 h-14 w-14 group"
                  >
                    <Play className="w-6 h-6 fill-current ml-1 group-hover:scale-110 transition-transform" />
                  </Button>
                )}
               </div>
            </div>

            {/* Work log description */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-gray-400 Montserrat">Focus Notes</Label>
                  {description && <Check className="w-3 h-3 text-primary" />}
               </div>
              <Input 
                placeholder="What did you achieve in this session?"
                value={description}
                onChange={(e) => updateDescription(e.target.value)}
                className="bg-white/5 border-white/5 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 text-white rounded-2xl h-14 Montserrat text-sm transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!showSaveConfirm ? (
                <Button 
                  onClick={handleStopAndSave}
                  className="w-full bg-white hover:bg-gray-200 text-black font-black rounded-2xl h-14 Montserrat text-sm shadow-xl shadow-white/5"
                >
                  <Square className="w-4 h-4 mr-2 fill-current" /> Finish & Save Session
                </Button>
              ) : (
                <div className="flex flex-col w-full gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-5 rounded-[1.5rem] bg-primary/10 border border-primary/20 text-center">
                     <p className="text-xs font-bold text-white Montserrat leading-relaxed">
                       Ready to post <span className="text-primary">{(displayTime / 3600).toFixed(2)} hours</span> to your timesheet?
                     </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={onDiscard}
                      className="flex-1 font-bold rounded-2xl h-12 text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all Montserrat text-xs"
                    >
                      Discard
                    </Button>
                    <Button 
                      onClick={onConfirmSave}
                      className="flex-[2] bg-primary hover:bg-primary/90 text-white font-black rounded-2xl h-12 shadow-lg shadow-primary/20 Montserrat text-xs"
                    >
                      Confirm & Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalTimer;
