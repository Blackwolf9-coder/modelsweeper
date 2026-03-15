import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const formatBytesToGb = (value: number): string => `${(value / 1024 ** 3).toFixed(1)} GB`;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
