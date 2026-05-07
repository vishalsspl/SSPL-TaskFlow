import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/api';

export const useTimerStore = create(
  persist(
    (set, get) => ({
      activeTaskId: null,
      activeProjectId: null,
      activeTaskTitle: '',
      startTime: null,
      isRunning: false,
      elapsedSeconds: 0,
      description: '',
      userId: null,
      isRecorderOpen: false,

      setRecorderOpen: (open) => set({ isRecorderOpen: open }),

      syncUser: (id) => {
        const { userId } = get();
        if (id && userId !== id) {
          get().resetTimer();
          set({ userId: id });
        }
      },

      startTimer: (taskId, projectId, taskTitle) => {
        const { isRunning, activeTaskId } = get();
        
        // If already running for THIS task, do nothing
        if (isRunning && activeTaskId === taskId) return;
        
        // If running for a DIFFERENT task, ideally stop it first (managed by caller or here)
        set({
          activeTaskId: taskId,
          activeProjectId: projectId,
          activeTaskTitle: taskTitle,
          startTime: Date.now(),
          isRunning: true,
          elapsedSeconds: 0,
          description: '',
        });
      },

      pauseTimer: () => {
        const { isRunning, startTime, elapsedSeconds } = get();
        if (!isRunning) return;

        const sessionElapsed = Math.floor((Date.now() - startTime) / 1000);
        set({
          isRunning: false,
          elapsedSeconds: elapsedSeconds + sessionElapsed,
          startTime: null,
        });
      },

      resumeTimer: () => {
        const { isRunning } = get();
        if (isRunning) return;

        set({
          isRunning: true,
          startTime: Date.now(),
        });
      },

      stopTimer: () => {
        const { isRunning, startTime, elapsedSeconds } = get();
        let totalElapsed = elapsedSeconds;
        
        if (isRunning && startTime) {
          totalElapsed += Math.floor((Date.now() - startTime) / 1000);
        }

        set({
          isRunning: false,
          startTime: null,
          elapsedSeconds: totalElapsed,
        });
        
        return totalElapsed;
      },

      resetTimer: () => {
        set({
          activeTaskId: null,
          activeProjectId: null,
          activeTaskTitle: '',
          startTime: null,
          isRunning: false,
          elapsedSeconds: 0,
          description: '',
          isRecorderOpen: false,
        });
      },

      updateDescription: (desc) => set({ description: desc }),

      saveWorklog: async (reason = '') => {
        const { activeTaskId, activeProjectId, description, getCurrentElapsed } = get();
        const totalSeconds = getCurrentElapsed();
        
        if (!activeTaskId || !activeProjectId || totalSeconds < 60) {
           return { error: 'Timer too short or no task selected' };
        }

        try {
          const hours = (totalSeconds / 3600).toFixed(2);
          const logDescription = reason ? `${description || 'Timer log'} (Auto-submitted: ${reason})` : (description || 'Timer log');
          
          await api.post('/worklogs', {
            projectId: activeProjectId,
            taskId: activeTaskId,
            date: new Date().toISOString(),
            hours: parseFloat(hours),
            description: logDescription
          });
          
          get().resetTimer();
          return { success: true };
        } catch (error) {
          console.error('Failed to save worklog:', error);
          return { error: 'Failed to save worklog' };
        }
      },

      autoSaveWorklog: async (reason = 'Window Closed') => {
        const { activeTaskId, activeProjectId, description, getCurrentElapsed } = get();
        const totalSeconds = getCurrentElapsed();
        
        if (!activeTaskId || !activeProjectId || totalSeconds < 60) {
          return;
        }

        const hours = (totalSeconds / 3600).toFixed(2);
        const logDescription = `${description || 'Timer log'} (Auto-submitted: ${reason})`;
        
        const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
        const token = authData?.state?.token;
        
        if (!token) return;

        const data = {
          projectId: activeProjectId,
          taskId: activeTaskId,
          date: new Date().toISOString(),
          hours: parseFloat(hours),
          description: logDescription
        };

        const API_URL = import.meta.env.VITE_API_URL;
        
        try {
          await fetch(`${API_URL}/api/worklogs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
            keepalive: true
          });
          get().resetTimer();
        } catch (e) {
          console.error('Auto-save failed:', e);
        }
      },

      getCurrentElapsed: () => {
        const { isRunning, startTime, elapsedSeconds } = get();
        if (!isRunning || !startTime) return elapsedSeconds;
        return elapsedSeconds + Math.floor((Date.now() - startTime) / 1000);
      }
    }),
    {
      name: 'timer-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
