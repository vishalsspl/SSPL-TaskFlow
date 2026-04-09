import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

export function formatChatTimestamp(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  const timeStr = date.toLocaleTimeString([], timeOptions);

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

export const formatCurrency = (value) => {
  if (value === null || value === undefined) return "₹0";
  const numValue = Number(value);
  if (isNaN(numValue)) return "₹0";

  if (numValue >= 10_000_000) return `₹${(numValue / 10_000_000).toFixed(2)} Cr`;
  if (numValue >= 100_000) return `₹${(numValue / 100_000).toFixed(2)} L`;
  return `₹${numValue.toLocaleString('en-IN')}`;
};

export const priorityColors = {
  LOW: 'bg-sky-500/10 text-sky-400 border border-sky-500/20 Montserrat font-bold',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 Montserrat font-bold',
  HIGH: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 Montserrat font-bold',
  URGENT: 'bg-red-500/10 text-red-400 border border-red-500/20 Montserrat font-bold',
};

export const statusColors = {
  TODO: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 Montserrat font-bold',
  IN_PROGRESS: 'bg-[#00A3FF]/10 text-[#00A3FF] border border-[#00A3FF]/20 Montserrat font-bold',
  IN_REVIEW: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 Montserrat font-bold',
  COMPLETED: 'bg-[#48A111]/10 text-[#48A111] border border-[#48A111]/20 Montserrat font-bold',
};

export const taskTypeColors = {
  TASK: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 Montserrat font-bold',
  BUG: 'bg-red-500/10 text-red-500 border border-red-500/20 Montserrat font-bold',
  STORY: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 Montserrat font-bold',
  EPIC: 'bg-purple-500/10 text-purple-500 border border-purple-500/20 Montserrat font-bold',
  SUBTASK: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 Montserrat font-bold',
};
