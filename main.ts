import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import prettierTypeScript from "prettier/plugins/typescript";
import prettierMarkdown from "prettier/plugins/markdown";
import prettierCss from "prettier/plugins/postcss";
import prettierHtml from "prettier/plugins/html";
import prettierJavaScript from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";
import prettier from "prettier/standalone";

interface PrettierPluginSettings {
	formatOnSave: boolean;
}

const DEFAULT_SETTINGS: PrettierPluginSettings = {
	formatOnSave: true,
};

const PRETTIER_PLUGINS = [
	prettierMarkdown,
	prettierTypeScript,
	prettierCss,
	prettierHtml,
	prettierJavaScript,
	prettierEstree,
];

export default class PrettierPlugin extends Plugin {
	settings: PrettierPluginSettings;

	async onload() {
		await this.loadSettings();

		async function format(_part: "all", editor: Editor) {
			const cursor = editor.getCursor();
			const text = editor.getValue();
			const formatted = await prettier.formatWithCursor(text, {
				parser: "markdown",
				cursorOffset: editor.posToOffset(cursor),
				plugins: PRETTIER_PLUGINS,
			});
			editor.setValue(formatted.formatted);
			editor.setCursor(editor.offsetToPos(formatted.cursorOffset));
		}

		this.addCommand({
			id: "format-document",
			name: "Format Document",
			async editorCallback(editor) {
				await format("all", editor);
			},
		});

		const saveCommandDefinition =
			// @ts-expect-error this is a private property
			this.app.commands?.commands?.["editor:save-file"];
		const save = saveCommandDefinition?.callback;

		const formatOnSave = async () => {
			if (!this.settings.formatOnSave) {
				return;
			}
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				return;
			}

			await format("all", view.editor);
		};

		if (typeof save === "function") {
			saveCommandDefinition.callback = async () => {
				await formatOnSave();
				save();
			};
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PrettierSettingTab(this.app, this));

		// const extensions: Extension[] = [];
		// this.registerEditorExtension(extensions);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PrettierSettingTab extends PluginSettingTab {
	plugin: PrettierPlugin;

	constructor(app: App, plugin: PrettierPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Format on save")
			.setDesc("Formats the document on save.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.formatOnSave)
					.onChange(async (value) => {
						this.plugin.settings.formatOnSave = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
