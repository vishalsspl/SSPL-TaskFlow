import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Timer, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from '../hooks/use-toast';
import api from '../lib/api';

const TimerWidget = ({ taskId, projectId, onSave }) => {
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [description, setDescription] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  const handleStop = () => {
    setIsActive(false);
    setShowSaveDialog(true);
  };

  const handleSave = async () => {
    try {
      const hours = (time / 3600).toFixed(2);
      await api.post('/worklogs', {
        projectId,
        taskId,
        date: new Date().toISOString(),
        hours: parseFloat(hours),
        description: description || 'Timer log'
      });

      toast({
        title: "Worklog Saved",
        description: `${hours} hours logged successfully.`,
      });

      setTime(0);
      setDescription('');
      setShowSaveDialog(false);
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving worklog:', error);
      toast({
        title: "Error",
        description: "Failed to save worklog.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!showSaveDialog ? (
        <Card className="shadow-2xl border-primary/20 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 overflow-hidden min-w-[200px]">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-full ${isActive ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-primary/10 text-primary'}`}>
              <Timer className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Timer</span>
              <span className="text-xl font-mono font-bold tabular-nums">{formatTime(time)}</span>
            </div>
            <div className="ml-auto flex gap-1">
              {!isActive && time === 0 ? (
                <Button size="icon" variant="ghost" onClick={handleToggle} className="rounded-full hover:bg-green-50 hover:text-green-600">
                  <Play className="w-5 h-5 fill-current" />
                </Button>
              ) : isActive ? (
                <Button size="icon" variant="ghost" onClick={handleToggle} className="rounded-full hover:bg-yellow-50 hover:text-yellow-600">
                  <Square className="w-5 h-5 fill-current" />
                </Button>
              ) : (
                <>
                  <Button size="icon" variant="ghost" onClick={handleToggle} className="rounded-full hover:bg-green-50 hover:text-green-600">
                    <Play className="w-5 h-5 fill-current" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleStop} className="rounded-full hover:bg-blue-50 hover:text-blue-600">
                    <Save className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-2xl border-primary/20 w-[calc(100vw-2rem)] sm:w-80">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Log Work</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowSaveDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Time Spent</Label>
              <div className="text-2xl font-mono bg-muted p-2 rounded text-center">
                {formatTime(time)} ({(time / 3600).toFixed(2)} hrs)
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="What did you work on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleSave}>
              Save Log
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimerWidget;