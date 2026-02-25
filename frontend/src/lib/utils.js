import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

export const formatCurrency = (value) => {
  if (value === null || value === undefined) return "$0";
  const numValue = Number(value);
  if (isNaN(numValue)) return "$0";

  if (numValue >= 1_000_000) return `$${(numValue / 1_000_000).toFixed(1)}M`;
  if (numValue >= 1_000) return `$${(numValue / 1_000).toFixed(1)}K`;
  return `$${numValue.toLocaleString()}`;
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
  BLOCKED: 'bg-red-600/10 text-red-500 border border-red-600/20 Montserrat font-bold',
};
