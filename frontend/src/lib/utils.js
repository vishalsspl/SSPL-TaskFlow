import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const priorityColors = {
  LOW: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25',
  MEDIUM: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25',
  HIGH: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25',
  CRITICAL: 'bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25',
};

export const statusColors = {
  TODO: 'bg-muted text-muted-foreground hover:bg-muted/80',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25',
  IN_REVIEW: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25',
  COMPLETED: 'bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25',
  BLOCKED: 'bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25',
};
