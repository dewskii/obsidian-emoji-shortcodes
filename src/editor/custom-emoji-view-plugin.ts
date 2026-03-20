import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view';
import type EmojiShortcodesPlugin from '../main';
import { checkForInputBlockEditorView } from '../util';
import { emoji } from '../emojiList';

class CustomEmojiWidget extends WidgetType {
	constructor(readonly imgSrc: string, readonly shortcode: string) {
		super();
	}

	toDOM(): HTMLElement {
		const wrapper = document.createElement('span');
		wrapper.className = 'ES-emoji-wrapper';
		
		const img = document.createElement('img');
		img.src = this.imgSrc;
		img.alt = this.shortcode;
		img.className = 'ES-inline-emoji';
		wrapper.appendChild(img);
		
		const tooltip = document.createElement('span');
		tooltip.className = 'ES-emoji-tooltip';
		
		const tooltipImg = document.createElement('img');
		tooltipImg.src = this.imgSrc;
		tooltipImg.className = 'ES-tooltip-emoji';
		tooltip.appendChild(tooltipImg);
		
		const tooltipText = document.createElement('span');
		tooltipText.className = 'ES-tooltip-text';
		tooltipText.textContent = this.shortcode;
		tooltip.appendChild(tooltipText);
		
		wrapper.appendChild(tooltip);
		return wrapper;
	}

	eq(other: CustomEmojiWidget): boolean {
		return this.shortcode === other.shortcode;
	}
}

class UnicodeEmojiWidget extends WidgetType {
	constructor(readonly emojiChar: string, readonly shortcode: string) {
		super();
	}

	toDOM(): HTMLElement {
		const wrapper = document.createElement('span');
		wrapper.className = 'ES-emoji-wrapper';
		
		const emojiSpan = document.createElement('span');
		emojiSpan.className = 'ES-unicode-emoji';
		emojiSpan.textContent = this.emojiChar;
		wrapper.appendChild(emojiSpan);
		
		const tooltip = document.createElement('span');
		tooltip.className = 'ES-emoji-tooltip';
		
		const tooltipEmoji = document.createElement('span');
		tooltipEmoji.className = 'ES-tooltip-unicode';
		tooltipEmoji.textContent = this.emojiChar;
		tooltip.appendChild(tooltipEmoji);
		
		const tooltipText = document.createElement('span');
		tooltipText.className = 'ES-tooltip-text';
		tooltipText.textContent = this.shortcode;
		tooltip.appendChild(tooltipText);
		
		wrapper.appendChild(tooltip);
		return wrapper;
	}

	eq(other: UnicodeEmojiWidget): boolean {
		return this.shortcode === other.shortcode;
	}
}

export function createCustomEmojiViewPlugin(plugin: EmojiShortcodesPlugin) {
	let lastImmediateReplace = plugin.settings.immediateReplace;
	
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				const settingChanged = plugin.settings.immediateReplace !== lastImmediateReplace;
				if (update.docChanged || update.viewportChanged || settingChanged) {
					lastImmediateReplace = plugin.settings.immediateReplace;
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				if (!plugin.settings.immediateReplace) {
					return Decoration.none;
				}

				const builder = new RangeSetBuilder<Decoration>();
				const shortcodeRegex = /:([a-z0-9_]+):/g;

				for (const { from, to } of view.visibleRanges) {
					const text = view.state.doc.sliceString(from, to);
					let match;

					while ((match = shortcodeRegex.exec(text)) !== null) {
						const shortcode = match[0];
						const shortcodeName = match[1];
						const start = from + match.index;
						const end = start + shortcode.length;

						if (!checkForInputBlockEditorView(view, start)) {
							continue;
						}

						const customEmoji = plugin.settings.customEmojis.find(e => e.shortcode === shortcodeName);
						if (customEmoji) {
							const imgSrc = plugin.getCustomEmojiPath(customEmoji.filename);
							const widget = Decoration.replace({
								widget: new CustomEmojiWidget(imgSrc, shortcode),
							});
							builder.add(start, end, widget);
						} else if (shortcode in emoji) {
							const emojiChar = emoji[shortcode] as string;
							const widget = Decoration.replace({
								widget: new UnicodeEmojiWidget(emojiChar, shortcode),
							});
							builder.add(start, end, widget);
						}
					}
				}

				return builder.finish();
			}
		},
		{
			decorations: (instance) => instance.decorations,
		}
	);
}
