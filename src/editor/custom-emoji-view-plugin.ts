import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType, ViewPlugin, ViewUpdate } from '@codemirror/view';
import EmojiShortcodesPlugin from '../main';
import { checkForInputBlockEditorView } from '../util';

class CustomEmojiWidget extends WidgetType {
	constructor(readonly imgSrc: string, readonly shortcode: string) {
		super();
	}

	toDOM(): HTMLElement {
		const img = document.createElement('img');
		img.src = this.imgSrc;
		img.alt = this.shortcode;
		img.className = 'ES-inline-emoji';
		return img;
	}

	eq(other: CustomEmojiWidget): boolean {
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
