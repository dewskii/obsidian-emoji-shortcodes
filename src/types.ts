export interface CustomEmoji {
	shortcode: string;
	filename: string;
	addedAt: number;
}

export const EMOJI_FOLDER = 'emojis';
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/gif', 'image/jpeg', 'image/webp'];
