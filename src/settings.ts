// settings.ts — 2025-05-02

import { App, PluginSettingTab, Setting, TFolder, FuzzySuggestModal } from "obsidian";
import BooxSync from "./main";

export type CitationStyle = "MLA" | "APA" | "Chicago";

export interface BooxSyncSettings {
  booxFolder: string;
  outputFolder: string;
  citationStyle: CitationStyle;
  namingConvention: "TitleAuthor" | "TitleOnly";
  importPDFs: boolean;
  enableMetadataFetch: boolean;
  scanIntervalSeconds: number;
  highlightSectionTitle: string;
  includedYamlFields: string[];
  insertAtTop: boolean;
}

export const DEFAULT_SETTINGS: BooxSyncSettings = {
  booxFolder: "Templates/Attachments",
  outputFolder: "Books",
  citationStyle: "MLA",
  namingConvention: "TitleAuthor",
  importPDFs: true,
  enableMetadataFetch: true,
  scanIntervalSeconds: 60,
  highlightSectionTitle: "Highlights",
  insertAtTop: false,
  includedYamlFields: [
    "title", "author", "publisher", "publishdate", "pages",
    "ISBN10", "ISBN13", "source", "url", "date", "tags",
    "rating", "date read", "status", "how read",
    "highlights", "modified", "type"
  ]
};

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  constructor(app: App, private onChoose: (folder: TFolder) => void) {
    super(app);
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const walk = (folder: TFolder) => {
      folders.push(folder);
      for (const child of folder.children) {
        if (child instanceof TFolder) walk(child);
      }
    };
    walk(this.app.vault.getRoot());
    return folders;
  }

  getItemText(item: TFolder): string {
    return item.path;
  }

  onChooseItem(item: TFolder): void {
    this.onChoose(item);
  }
}

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
      .setDesc("Folder to watch for Boox highlight .txt files")
      .addButton(btn => {
        btn.setButtonText(this.plugin.settings.booxFolder || "Select Folder");
        btn.onClick(() => {
          new FolderSuggestModal(this.app, folder => {
            this.plugin.settings.booxFolder = folder.path;
            btn.setButtonText(folder.path);
            this.plugin.saveSettings();
          }).open();
        });
      });

    new Setting(containerEl)
      .setName("Output Folder")
      .setDesc("Where to save converted book notes")
      .addButton(btn => {
        btn.setButtonText(this.plugin.settings.outputFolder || "Select Folder");
        btn.onClick(() => {
          new FolderSuggestModal(this.app, folder => {
            this.plugin.settings.outputFolder = folder.path;
            btn.setButtonText(folder.path);
            this.plugin.saveSettings();
          }).open();
        });
      });

    new Setting(containerEl)
      .setName("Citation Style")
      .setDesc("Format used for quoted highlights")
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
      .setName("Note Naming Convention")
      .setDesc("How book notes are named")
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
      .setDesc("Enable importing .pdfs from Boox")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.importPDFs)
          .onChange(async (value) => {
            this.plugin.settings.importPDFs = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable Metadata Fetch")
      .setDesc("Use Google Books to auto-fill metadata")
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
      .setDesc("Interval to scan folder for new files")
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
      .setName("Highlights Section Title")
      .setDesc("Custom heading for highlight section")
      .addText(text =>
        text
          .setPlaceholder("Highlights")
          .setValue(this.plugin.settings.highlightSectionTitle)
          .onChange(async (value) => {
            this.plugin.settings.highlightSectionTitle = value.trim() || "Highlights";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("YAML Fields to Include")
      .setDesc("Comma-separated YAML keys to include in frontmatter")
      .addText(text =>
        text
          .setPlaceholder("title, author, type, etc.")
          .setValue(this.plugin.settings.includedYamlFields.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.includedYamlFields = value
              .split(",")
              .map(f => f.trim())
              .filter(f => f.length > 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Insert Highlights at Top")
      .setDesc("Whether to insert new highlights before or after existing ones")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.insertAtTop)
          .onChange(async (value) => {
            this.plugin.settings.insertAtTop = value;
            await this.plugin.saveSettings();
          })
      );
  }
}