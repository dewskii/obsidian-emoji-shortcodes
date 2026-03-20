import { MarkdownPostProcessorContext } from "obsidian";
import { emoji } from "./emojiList";
import EmojiShortcodesPlugin from "./main";
import { createEmojiWrapper, type EmojiData } from "./utils/emoji-dom";

export default class EmojiMarkdownPostProcessor {

    static emojiProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext, plugin: EmojiShortcodesPlugin) => {
		const shortcodes = el.innerText.match(/[:][^\s:][^ \n:]*[:]/g);
		if (!shortcodes) return;

		shortcodes.forEach((shortcode: string) => {
			if (plugin.isCustomEmoji(shortcode)) {
				const customEmoji = plugin.getCustomEmoji(shortcode);
				if (customEmoji) {
					const imgSrc = plugin.getCustomEmojiPath(customEmoji.filename);
					EmojiMarkdownPostProcessor.replaceShortcode(shortcode, el, { type: 'custom', imgSrc, shortcode });
				}
			} else {
				const emojiChar = emoji[shortcode] ?? shortcode;
				EmojiMarkdownPostProcessor.replaceShortcode(shortcode, el, { type: 'unicode', char: emojiChar, shortcode });
			}
		});
	}

	static replaceShortcode(shortcode: string, el: HTMLElement, data: EmojiData) {
		if ((typeof el.tagName === "string") && (el.tagName.indexOf("CODE") !== -1 || el.tagName.indexOf("MJX") !== -1)) {
			return;
		}
		if (el.hasChildNodes()) {
			Array.from(el.childNodes).forEach((child: ChildNode) => this.replaceShortcode(shortcode, child as HTMLElement, data));
		} else if (el.nodeType === Node.TEXT_NODE && el.textContent?.includes(shortcode)) {
			const parent = el.parentNode;
			if (!parent) return;
			
			const text = el.textContent;
			const parts = text.split(shortcode);
			const fragment = document.createDocumentFragment();
			
			parts.forEach((part, index) => {
				if (part) {
					fragment.appendChild(document.createTextNode(part));
				}
				if (index < parts.length - 1) {
					fragment.appendChild(createEmojiWrapper(data));
				}
			});
			
			parent.replaceChild(fragment, el);
		}
	}
}
