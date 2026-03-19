import { Plugin, EditorSuggest, Editor, EditorPosition, TFile, EditorSuggestTriggerInfo, EditorSuggestContext, normalizePath } from 'obsidian';
import { emoji } from './emojiList';
import EmojiMarkdownPostProcessor from './emojiPostProcessor';
import { DEFAULT_SETTINGS, EmojiPluginSettings, EmojiPluginSettingTab } from './settings';
import { CustomEmoji, EMOJI_FOLDER } from './types';
import { checkForInputBlock } from './util';
import { AddEmojiModal } from './ui/add-emoji-modal';
import { createCustomEmojiViewPlugin } from './editor/custom-emoji-view-plugin';

export default class EmojiShortcodesPlugin extends Plugin {

	public settings!: EmojiPluginSettings;
	public emojiList!: string[];
	private emojiFolderPath!: string;

	async onload() {
		await this.loadSettings();
		this.emojiFolderPath = normalizePath(`${this.manifest.dir}/${EMOJI_FOLDER}`);
		await this.ensureEmojiFolder();
		
		this.addSettingTab(new EmojiPluginSettingTab(this.app, this));
		this.registerEditorSuggest(new EmojiSuggester(this));

		this.registerMarkdownPostProcessor((el, ctx) => {
			EmojiMarkdownPostProcessor.emojiProcessor(el, ctx, this);
		});

		this.registerEditorExtension(createCustomEmojiViewPlugin(this));

		this.addRibbonIcon('smile-plus', 'Add Custom Emoji', () => {
			new AddEmojiModal(this.app, this, () => {}).open();
		});

		this.addCommand({
			id: 'add-custom-emoji',
			name: 'Add custom emoji',
			callback: () => {
				new AddEmojiModal(this.app, this, () => {}).open();
			}
		});
	}

	private async ensureEmojiFolder() {
		const adapter = this.app.vault.adapter;
		if (!await adapter.exists(this.emojiFolderPath)) {
			await adapter.mkdir(this.emojiFolderPath);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.updateEmojiList()
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateEmojiList()
	}

	updateEmojiList() {
		const historySet = new Set(this.settings.history);
		const builtInEmojis = Object.keys(emoji).filter(e => !historySet.has(e));
		const customEmojiKeys = this.settings.customEmojis.map(e => `:${e.shortcode}:`);
		this.emojiList = [...customEmojiKeys, ...this.settings.history, ...builtInEmojis];
	}

	getCustomEmojiPath(filename: string): string {
		return this.app.vault.adapter.getResourcePath(normalizePath(`${this.emojiFolderPath}/${filename}`));
	}

	isCustomEmoji(shortcode: string): boolean {
		const code = shortcode.replace(/:/g, '');
		return this.settings.customEmojis.some(e => e.shortcode === code);
	}

	getCustomEmoji(shortcode: string): CustomEmoji | undefined {
		const code = shortcode.replace(/:/g, '');
		return this.settings.customEmojis.find(e => e.shortcode === code);
	}

	async addCustomEmoji(shortcode: string, file: File): Promise<void> {
		const ext = file.name.split('.').pop() || 'png';
		const filename = `${shortcode}.${ext}`;
		const filePath = normalizePath(`${this.emojiFolderPath}/${filename}`);
		
		const arrayBuffer = await file.arrayBuffer();
		await this.app.vault.adapter.writeBinary(filePath, arrayBuffer);
		
		this.settings.customEmojis.push({
			shortcode,
			filename,
			addedAt: Date.now()
		});
		
		await this.saveSettings();
	}

	async deleteCustomEmoji(shortcode: string): Promise<void> {
		const customEmoji = this.getCustomEmoji(shortcode);
		if (!customEmoji) return;

		const filePath = normalizePath(`${this.emojiFolderPath}/${customEmoji.filename}`);
		
		try {
			await this.app.vault.adapter.remove(filePath);
		} catch (e) {
			// already deleted
		}
		
		this.settings.customEmojis = this.settings.customEmojis.filter(e => e.shortcode !== shortcode);
		await this.saveSettings();
	}

	updateHistory(suggestion: string) {
		if (!this.settings.historyPriority) return;
		// Don't track custom emojis in history - they're already prioritized
		if (this.isCustomEmoji(suggestion)) return;

		const set = new Set([suggestion, ...this.settings.history]);
		const history = [...set].slice(0, this.settings.historyLimit);

		this.settings = Object.assign(this.settings, { history });
		this.saveSettings();
	}
}

class EmojiSuggester extends EditorSuggest<string> {
	plugin: EmojiShortcodesPlugin;

	constructor(plugin: EmojiShortcodesPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _: TFile): EditorSuggestTriggerInfo | null {
		if (this.plugin.settings.suggester) {

			if (!checkForInputBlock(editor, cursor.line, cursor.ch)) {
				return null;
			}

			const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
			const match = sub.match(/:\S+$/)?.first();
			if (match) {
				return {
					end: cursor,
					start: {
						ch: sub.lastIndexOf(match),
						line: cursor.line,
					},
					query: match,
				}
			}
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		let emoji_query = context.query.replace(':', '').toLowerCase();
		return this.plugin.emojiList.filter(p => p.includes(emoji_query));
	}

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		const outer = el.createDiv({ cls: "ES-suggester-container" });
		outer.createDiv({ cls: "ES-shortcode" }).setText(suggestion.replace(/:/g, ""));
		
		if (this.plugin.isCustomEmoji(suggestion)) {
			const customEmoji = this.plugin.getCustomEmoji(suggestion);
			if (customEmoji) {
				outer.createEl('img', { 
					cls: "ES-emoji ES-custom-emoji-img",
					attr: { src: this.plugin.getCustomEmojiPath(customEmoji.filename) }
				});
			}
		} else {
			const emojiChar = (emoji as Record<string, string>)[suggestion];
			outer.createDiv({ cls: "ES-emoji" }).setText(emojiChar as string);
		}
	}

	selectSuggestion(suggestion: string): void {
		if(this.context) {
			let replacement: string;
			
			if (this.plugin.isCustomEmoji(suggestion)) {
				replacement = `${suggestion} `; // live view takes care of render
			} else if (this.plugin.settings.immediateReplace) {
				replacement = emoji[suggestion];
			} else {
				replacement = `${suggestion} `;
			}
			
			(this.context.editor as Editor).replaceRange(replacement, this.context.start, this.context.end);
			this.plugin.updateHistory(suggestion);
		}
	}
}
