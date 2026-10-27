import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({ extend: { theme: { radius: ['ui', 'panel'] } } });

export function cn(...values: ClassValue[]) {
	return twMerge(clsx(values));
}
