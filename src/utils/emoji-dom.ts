export type EmojiData = 
	| { type: 'custom'; imgSrc: string; shortcode: string }
	| { type: 'unicode'; char: string; shortcode: string };

export function createEmojiWrapper(data: EmojiData): HTMLElement {
	const wrapper = document.createElement('span');
	wrapper.className = 'ES-emoji-wrapper';

	const tooltip = document.createElement('span');
	tooltip.className = 'ES-emoji-tooltip';

	const tooltipText = document.createElement('span');
	tooltipText.className = 'ES-tooltip-text';
	tooltipText.textContent = data.shortcode;

	if (data.type === 'custom') {
		const img = document.createElement('img');
		img.src = data.imgSrc;
		img.alt = data.shortcode;
		img.className = 'ES-inline-emoji';
		wrapper.appendChild(img);

		const tooltipImg = document.createElement('img');
		tooltipImg.src = data.imgSrc;
		tooltipImg.className = 'ES-tooltip-emoji';
		tooltip.appendChild(tooltipImg);
	} else {
		const emojiSpan = document.createElement('span');
		emojiSpan.className = 'ES-unicode-emoji';
		emojiSpan.textContent = data.char;
		wrapper.appendChild(emojiSpan);

		const tooltipEmoji = document.createElement('span');
		tooltipEmoji.className = 'ES-tooltip-unicode';
		tooltipEmoji.textContent = data.char;
		tooltip.appendChild(tooltipEmoji);
	}

	tooltip.appendChild(tooltipText);
	wrapper.appendChild(tooltip);
	return wrapper;
}
