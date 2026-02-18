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
  LOW: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  HIGH: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 hover:bg-red-200',
};

export const statusColors = {
  TODO: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  IN_REVIEW: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
  COMPLETED: 'bg-green-100 text-green-700 hover:bg-green-200',
  BLOCKED: 'bg-red-100 text-red-700 hover:bg-red-200',
};
