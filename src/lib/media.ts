/** Provider-neutral images; callers own URL validation, hydration and moderation policy. */
export type Photo = {
	id?: string;
	src: string;
	thumbnail?: string;
	alt?: string;
	width?: number;
	height?: number;
	contentWarning?: boolean;
};
