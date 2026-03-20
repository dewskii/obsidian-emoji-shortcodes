import { MarkdownPostProcessorContext } from "obsidian";
import { emoji } from "./emojiList";
import EmojiShortcodesPlugin from "./main";

export default class EmojiMarkdownPostProcessor {

    static emojiProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin: EmojiShortcodesPlugin) => {
		const shortcodes = el.innerText.match(/[:][^\s:][^ \n:]*[:]/g);
		if (!shortcodes) return;

		shortcodes.forEach((shortcode: string) => {
			if (plugin.isCustomEmoji(shortcode)) {
				const customEmoji = plugin.getCustomEmoji(shortcode);
				if (customEmoji) {
					const imgSrc = plugin.getCustomEmojiPath(customEmoji.filename);
					const imgTag = `<span class="ES-emoji-wrapper"><img src="${imgSrc}" alt="${shortcode}" class="ES-inline-emoji"><span class="ES-emoji-tooltip"><img src="${imgSrc}" class="ES-tooltip-emoji"><span class="ES-tooltip-text">${shortcode}</span></span></span>`;
					EmojiMarkdownPostProcessor.htmlReplace(shortcode, el, imgTag);
				}
			} else {
				const emojiChar = emoji[shortcode] ?? shortcode;
				const wrappedEmoji = `<span class="ES-emoji-wrapper"><span class="ES-unicode-emoji">${emojiChar}</span><span class="ES-emoji-tooltip"><span class="ES-tooltip-unicode">${emojiChar}</span><span class="ES-tooltip-text">${shortcode}</span></span></span>`;
				EmojiMarkdownPostProcessor.htmlReplace(shortcode, el, wrappedEmoji);
			}
		});
	}

	static htmlReplace(shortcode: string, el: HTMLElement, replacement: string) {
		if ((typeof el.tagName === "string") && (el.tagName.indexOf("CODE") !== -1 || el.tagName.indexOf("MJX") !== -1)) {
			return;
		}
		if (el.hasChildNodes()) {
			Array.from(el.childNodes).forEach((child: ChildNode) => this.htmlReplace(shortcode, child as HTMLElement, replacement));
		} else if (el.textContent && el.textContent.includes(shortcode)) {
			const parent = el.parentNode as HTMLElement;
			if (parent) {
				const template = document.createElement('template');
				// eslint-disable-next-line @microsoft/sdl/no-inner-html
				template.innerHTML = parent.innerHTML.split(shortcode).join(replacement);
				parent.replaceChildren(...Array.from(template.content.childNodes));
			}
		}
	}
}
