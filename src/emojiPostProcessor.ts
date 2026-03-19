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
					const imgTag = `<img src="${imgSrc}" alt="${shortcode}" class="ES-inline-emoji">`;
					EmojiMarkdownPostProcessor.customEmojiReplace(shortcode, el, imgTag);
				}
			} else {
				const replacement = emoji[shortcode as keyof typeof emoji] ?? shortcode;
				EmojiMarkdownPostProcessor.emojiReplace(shortcode, el, replacement);
			}
		});
	}

	static emojiReplace(shortcode: string, el: HTMLElement, replacement: string) {
		if ((typeof el.tagName === "string") && (el.tagName.indexOf("CODE") !== -1 || el.tagName.indexOf("MJX") !== -1)) {
			return;
		}
		if (el.hasChildNodes()) {
			el.childNodes.forEach((child: ChildNode) => this.emojiReplace(shortcode, child as HTMLElement, replacement));
		} else if (el.textContent) {
			el.textContent = el.textContent.replace(shortcode, replacement);
		}
	}

	static customEmojiReplace(shortcode: string, el: HTMLElement, imgTag: string) {
		if ((typeof el.tagName === "string") && (el.tagName.indexOf("CODE") !== -1 || el.tagName.indexOf("MJX") !== -1)) {
			return;
		}
		if (el.hasChildNodes()) {
			Array.from(el.childNodes).forEach((child: ChildNode) => this.customEmojiReplace(shortcode, child as HTMLElement, imgTag));
		} else if (el.textContent && el.textContent.includes(shortcode)) {
			const parent = el.parentNode as HTMLElement;
			if (parent && parent.innerHTML) {
				parent.innerHTML = parent.innerHTML.split(shortcode).join(imgTag);
			}
		}
	}
}
