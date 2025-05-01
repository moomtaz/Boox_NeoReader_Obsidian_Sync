// settings.ts
import { App, PluginSettingTab, Setting } from "obsidian";
import BooxSync from "./main";

export type CitationStyle = "MLA" | "APA" | "Chicago";

export interface BooxSyncSettings {
  booxFolder: string;
  outputFolder: string;
  moveCompletedTo: string;
  citationStyle: CitationStyle;
  namingConvention: "TitleAuthor" | "TitleOnly";
  importPDFs: boolean;
  enableMetadataFetch: boolean;
  scanIntervalSeconds: number;
  overwriteTemplate: boolean;
}

export const DEFAULT_SETTINGS: BooxSyncSettings = {
  booxFolder: "Templates/Attachments",
  outputFolder: "Books",
  moveCompletedTo: "Books/Library",
  citationStyle: "MLA",
  namingConvention: "TitleAuthor",
  importPDFs: true,
  enableMetadataFetch: true,
  scanIntervalSeconds: 60,
  overwriteTemplate: false,
};

export class BooxSyncSettingTab extends PluginSettingTab {
  plugin: BooxSync;

  constructor(app: App, plugin: BooxSync) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Boox Sync Plugin Settings" });

    new Setting(containerEl)
      .setName("Boox Watch Folder")
      .setDesc("Folder to watch for Boox .txt highlight files")
      .addText(text =>
        text
          .setPlaceholder("Templates/Attachments")
          .setValue(this.plugin.settings.booxFolder)
          .onChange(async (value) => {
            this.plugin.settings.booxFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Output Folder for Book Notes")
      .setDesc("Temporary output location for created markdown files")
      .addText(text =>
        text
          .setPlaceholder("Books")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Final Destination Folder for Processed Notes")
      .setDesc("Where completed book notes should be moved")
      .addText(text =>
        text
          .setPlaceholder("Books/Library")
          .setValue(this.plugin.settings.moveCompletedTo)
          .onChange(async (value) => {
            this.plugin.settings.moveCompletedTo = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Citation Style")
      .setDesc("Choose the citation format to use in notes")
      .addDropdown(drop =>
        drop
          .addOption("MLA", "MLA")
          .addOption("APA", "APA")
          .addOption("Chicago", "Chicago")
          .setValue(this.plugin.settings.citationStyle)
          .onChange(async (value) => {
            this.plugin.settings.citationStyle = value as CitationStyle;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Note Naming Format")
      .setDesc("Choose how to name the created note files")
      .addDropdown(drop =>
        drop
          .addOption("TitleAuthor", "Title - Author")
          .addOption("TitleOnly", "Title Only")
          .setValue(this.plugin.settings.namingConvention)
          .onChange(async (value) => {
            this.plugin.settings.namingConvention = value as "TitleAuthor" | "TitleOnly";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Import Handwritten PDFs")
      .setDesc("If enabled, also import Boox handwritten notes saved as PDFs")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.importPDFs)
          .onChange(async (value) => {
            this.plugin.settings.importPDFs = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable Online Metadata Fetch")
      .setDesc("Use Google Books to auto-fill frontmatter metadata if missing")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableMetadataFetch)
          .onChange(async (value) => {
            this.plugin.settings.enableMetadataFetch = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Scan Interval (seconds)")
      .setDesc("How often to scan the watch folder for new files")
      .addText(text =>
        text
          .setPlaceholder("60")
          .setValue(this.plugin.settings.scanIntervalSeconds.toString())
          .onChange(async (value) => {
            const parsed = parseInt(value);
            if (!isNaN(parsed)) {
              this.plugin.settings.scanIntervalSeconds = parsed;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Overwrite Template Automatically")
      .setDesc("Recreate BooxBookTemplate.md every time the plugin loads")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.overwriteTemplate)
          .onChange(async (value) => {
            this.plugin.settings.overwriteTemplate = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
