import { PluginSettingTab, App, Setting } from "obsidian";
import EmojiShortcodesPlugin from "./main";
import { CustomEmoji } from "./types";
import { AddEmojiModal } from "./ui/add-emoji-modal";

export interface EmojiPluginSettings {
	immediateReplace: boolean;
	suggester: boolean;
	historyPriority: boolean;
	historyLimit: number;
	history: string[];
	customEmojis: CustomEmoji[];
}

export const DEFAULT_SETTINGS: EmojiPluginSettings = {
	immediateReplace: true,
	suggester: true,
	historyPriority: true,
	historyLimit: 100,
	history: [],
	customEmojis: [],
}

export class EmojiPluginSettingTab extends PluginSettingTab {
	plugin: EmojiShortcodesPlugin;

	constructor(app: App, plugin: EmojiShortcodesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		;

		new Setting(containerEl)
			.setName('Immediate emoji replace')
			.setDesc('If this is turned on, emoji shortcodes will be immediately replaced after typing. Otherwise they are still stored as a shortcode and you only see the emoji in preview mode.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.immediateReplace)
					.onChange(async value => {
						this.plugin.settings.immediateReplace = value;
						await this.plugin.saveSettings();
					})
			});

		new Setting(containerEl)
			.setName('Emoji suggester')
			.setDesc('If this is turned on, a suggester will appear everytime you type : followed by a letter. This will help you insert emojis (doesn\'t work on mobile).')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.suggester)
					.onChange(async value => {
						this.plugin.settings.suggester = value;
						await this.plugin.saveSettings();
					})
			});

		new Setting(containerEl)
			.setName('Use history priority')
			.setDesc('Suggester gives priority to recently used emoji.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.historyPriority)
					.onChange(async value => {
						this.plugin.settings.historyPriority = value;
						await this.plugin.saveSettings();
						this.display();
					})
			});

		if (this.plugin.settings.historyPriority) {
			new Setting(containerEl)
				.setName('History limit')
				.setClass('ES-sub-setting')
				.addText(cb => {
					cb.setPlaceholder(String(DEFAULT_SETTINGS.historyLimit))
						.setValue(String(this.plugin.settings.historyLimit))
						.onChange(async value => {
							this.plugin.settings.historyLimit = value !== '' ? Number(value) : DEFAULT_SETTINGS.historyLimit;
							await this.plugin.saveSettings();
						})
				});

			new Setting(containerEl)
				.setName('Clear history')
				.setClass('ES-sub-setting')
				.addButton(cb => {
					cb.setButtonText("Clear")
						.onClick(async () => {
							this.plugin.settings.history = [];
							await this.plugin.saveSettings();
						})
				});
		}

		new Setting(containerEl).setName('Custom emojis').setHeading();

		new Setting(containerEl)
			.setName('Add custom emoji')
			.setDesc('Upload custom emoji images to use with shortcodes.')
			.addButton(cb => {
				cb.setButtonText('Add emoji')
					.setCta()
					.onClick(() => {
						new AddEmojiModal(this.app, this.plugin, () => this.display()).open();
					});
			});

		if (this.plugin.settings.customEmojis.length > 0) {
			const emojiListContainer = containerEl.createDiv({ cls: 'ES-custom-emoji-list' });
			
			for (const customEmoji of this.plugin.settings.customEmojis) {
				const emojiItem = emojiListContainer.createDiv({ cls: 'ES-custom-emoji-item' });
				
				emojiItem.createEl('img', {
					cls: 'ES-custom-emoji-preview',
					attr: { src: this.plugin.getCustomEmojiPath(customEmoji.filename) }
				});
				
				emojiItem.createSpan({ text: `:${customEmoji.shortcode}:`, cls: 'ES-custom-emoji-shortcode' });
				
				const deleteBtn = emojiItem.createEl('button', { text: 'Delete', cls: 'ES-custom-emoji-delete' });
				deleteBtn.addEventListener('click', () => {
					void this.plugin.deleteCustomEmoji(customEmoji.shortcode).then(() => this.display());
				});
			}
		}
	}
}