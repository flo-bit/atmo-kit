export const baseColors = [
	'gray',
	'zinc',
	'neutral',
	'stone',
	'slate',
	'mist',
	'mauve',
	'olive',
	'taupe'
] as const;
export const accentColors = [
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose'
] as const;

export type BaseColor = (typeof baseColors)[number];
export type AccentColor = (typeof accentColors)[number];
export type Palette = { accent: AccentColor; base: BaseColor };

export const isBaseColor = (value: unknown): value is BaseColor =>
	baseColors.includes(value as BaseColor);
export const isAccentColor = (value: unknown): value is AccentColor =>
	accentColors.includes(value as AccentColor);

type Rgb = readonly [r: number, g: number, b: number];

/**
 * The palettes as sRGB, for records and other places that cannot name a palette: the page and
 * text colors of a base (its 50 and 950), and the 700 of an accent, which the kit uses for links
 * on a light page and which white text is readable on.
 */
export const baseColorRgb: Record<BaseColor, { background: Rgb; foreground: Rgb }> = {
	gray: { background: [249, 250, 251], foreground: [3, 7, 18] },
	zinc: { background: [250, 250, 250], foreground: [9, 9, 11] },
	neutral: { background: [250, 250, 250], foreground: [10, 10, 10] },
	stone: { background: [250, 250, 249], foreground: [12, 10, 9] },
	slate: { background: [248, 250, 252], foreground: [2, 6, 24] },
	mist: { background: [249, 251, 251], foreground: [9, 11, 12] },
	mauve: { background: [250, 250, 250], foreground: [12, 9, 12] },
	olive: { background: [251, 251, 249], foreground: [12, 12, 9] },
	taupe: { background: [251, 250, 249], foreground: [12, 10, 9] }
};
export const accentColorRgb: Record<AccentColor, Rgb> = {
	red: [193, 0, 7],
	orange: [202, 53, 0],
	amber: [187, 77, 0],
	yellow: [166, 95, 0],
	lime: [73, 125, 0],
	green: [0, 130, 54],
	emerald: [0, 122, 85],
	teal: [0, 120, 111],
	cyan: [0, 117, 149],
	sky: [0, 105, 168],
	blue: [20, 71, 230],
	indigo: [67, 45, 215],
	violet: [112, 8, 231],
	purple: [130, 0, 219],
	fuchsia: [168, 0, 183],
	pink: [198, 0, 92],
	rose: [199, 0, 54]
};
