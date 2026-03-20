import { App, Modal, Notice } from 'obsidian';
import EmojiShortcodesPlugin from '../main';
import { SUPPORTED_IMAGE_TYPES } from '../types';
import { emoji } from '../emojiList';

export class AddEmojiModal extends Modal {
	plugin: EmojiShortcodesPlugin;
	onSave: () => void;
	
	private selectedFile: File | null = null;
	private previewEl: HTMLImageElement | null = null;
	private shortcodeInput: HTMLInputElement | null = null;
	private dropZone: HTMLElement | null = null;

	constructor(app: App, plugin: EmojiShortcodesPlugin, onSave: () => void) {
		super(app);
		this.plugin = plugin;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('ES-add-emoji-modal');

		contentEl.createEl('h2', { text: 'Add emoji' });

		const infoEl = contentEl.createDiv({ cls: 'ES-modal-info' });
		infoEl.createEl('p', { 
			text: 'Your custom emoji will be available in the emoji suggester. Square images with transparent backgrounds work best.'
		});

		contentEl.createEl('h4', { text: '1. Upload an image' });
		
		this.dropZone = contentEl.createDiv({ cls: 'ES-drop-zone' });
		
		const dropContent = this.dropZone.createDiv({ cls: 'ES-drop-zone-content' });
		
		this.previewEl = dropContent.createEl('img', { 
			cls: 'ES-emoji-preview ES-hidden',
			attr: { alt: 'Preview' }
		});
		
		const dropText = dropContent.createDiv({ cls: 'ES-drop-text' });
		dropText.createSpan({ text: 'Drag and drop or\n\n' });
		
		const uploadBtn = dropText.createEl('button', { text: 'Add image', cls: 'ES-upload-btn' });
		uploadBtn.addEventListener('click', () => this.openFilePicker());

		this.setupDragAndDrop();

		contentEl.createEl('h4', { text: '2. Give it a name' });
		contentEl.createEl('p', { 
			cls: 'ES-shortcode-desc',
			text: 'This is what you\'ll type to add this emoji to your notes.'
		});

		const shortcodeContainer = contentEl.createDiv({ cls: 'ES-shortcode-container' });
		shortcodeContainer.createSpan({ text: ':', cls: 'ES-shortcode-prefix' });
		this.shortcodeInput = shortcodeContainer.createEl('input', {
			type: 'text',
			cls: 'ES-shortcode-input',
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			attr: { placeholder: 'custom_emoji' }
		});
		shortcodeContainer.createSpan({ text: ':', cls: 'ES-shortcode-suffix' });

		const buttonContainer = contentEl.createDiv({ cls: 'ES-modal-buttons' });
		
		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());
		
		const saveBtn = buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' });
		saveBtn.addEventListener('click', () => void this.saveEmoji());
	}

	private setupDragAndDrop() {
		if (!this.dropZone) return;

		this.dropZone.addEventListener('dragover', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.dropZone?.addClass('ES-drag-over');
		});

		this.dropZone.addEventListener('dragleave', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.dropZone?.removeClass('ES-drag-over');
		});

		this.dropZone.addEventListener('drop', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.dropZone?.removeClass('ES-drag-over');
			
			const file = e.dataTransfer?.files[0];
			if (file) {
				this.handleFile(file);
			}
		});
	}

	private openFilePicker() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = SUPPORTED_IMAGE_TYPES.join(',');
		input.onchange = () => {
			if (input.files?.[0]) {
				this.handleFile(input.files[0]);
			}
		};
		input.click();
	}

	private handleFile(file: File) {
		if (SUPPORTED_IMAGE_TYPES.indexOf(file.type) === -1) {
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			new Notice('Please select a valid image file (PNG, GIF, JPG, or WEBP)');
			return;
		}

		this.selectedFile = file;
		
		const reader = new FileReader();
		reader.onload = (e) => {
			if (this.previewEl && e.target?.result) {
				this.previewEl.src = e.target.result as string;
				this.previewEl.removeClass('ES-hidden');
				this.dropZone?.addClass('ES-has-image');
			}
		};
		reader.readAsDataURL(file);

		if (this.shortcodeInput && !this.shortcodeInput.value) {
			const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
			const cleanName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9_]/g, '_');
			this.shortcodeInput.value = cleanName;
		}
	}

	private async saveEmoji() {
		if (!this.selectedFile) {
			new Notice('Please select an image first');
			return;
		}

		const shortcode = this.shortcodeInput?.value?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
		if (!shortcode) {
			new Notice('Please enter a shortcode');
			return;
		}

		const existingCustom = this.plugin.settings.customEmojis.find(e => e.shortcode === shortcode);
		if (existingCustom) {
			new Notice(`Shortcode ":${shortcode}:" already exists`);
			return;
		}

		// Check built-in emojis
		if (`:${shortcode}:` in emoji) {
			new Notice(`Shortcode ":${shortcode}:" conflicts with a built-in emoji`);
			return;
		}

		try {
			await this.plugin.addCustomEmoji(shortcode, this.selectedFile);
			new Notice(`Custom emoji ":${shortcode}:" added!`);
			this.onSave();
			this.close();
		} catch (error) {
			new Notice(`Failed to save emoji: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
