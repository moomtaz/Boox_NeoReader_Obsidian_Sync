// settings.ts — BooxSync Settings Tab
// Last updated: 2025-05-15 19:50 PDT

import { PluginSettingTab, Setting, App } from "obsidian";
import { FolderSuggester } from "./ui/FolderSuggester";

// 1. Define settings shape
export interface BooxSyncSettings {
  watchFolder: string;
  outputFolder: string;
  templateFolder: string;
  logFolder: string;
  highlightSectionTitle: string;
  citationStyle: "MLA" | "APA" | "Chicago";

  calloutMap?: Record<string, string>;
  showPage?: boolean;
  showTimestamp?: boolean;

  insertAtTop: boolean;
  includePDFs: boolean;
  enableMetadataFetch: boolean;
  skipMetadataPrompt: boolean;
  deleteAfterImport: boolean;
  logEvents: boolean;
  developerMode: boolean;
  enableAutoScan: boolean;

  scanIntervalMs: number;
}

// 2. Defaults
export const DEFAULT_SETTINGS: BooxSyncSettings = {
  watchFolder: "Boox/Watch",
  outputFolder: "Boox/Output",
  templateFolder: "Boox/Templates",
  logFolder: "Boox/Logs",
  highlightSectionTitle: "Highlights",
  citationStyle: "MLA",

  calloutMap: {
    "!": "tip",
    "@": "info",
    "^": "quote",
    "?": "question",
    "~": "abstract",
    "%": "danger",
    "*": "note"
  },
  showPage: true,
  showTimestamp: true,

  insertAtTop: false,
  includePDFs: true,
  enableMetadataFetch: true,
  skipMetadataPrompt: false,
  deleteAfterImport: true,
  logEvents: true,
  developerMode: false,
  enableAutoScan: false,

  scanIntervalMs: 60000,
};

// 3. UI
export class BooxSyncSettingTab extends PluginSettingTab {
  plugin: { settings: BooxSyncSettings; saveSettings: () => Promise<void> };

  constructor(app: App, plugin: { settings: BooxSyncSettings; saveSettings: () => Promise<void> }) {
    super(app, plugin as any);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "📘 Boox Sync Settings" });

    // 4. String fields
    const stringKeys = [
      "watchFolder",
      "outputFolder",
      "templateFolder",
      "logFolder",
      "highlightSectionTitle"
    ] as const;

    stringKeys.forEach((key) => {
      new Setting(containerEl)
        .setName(key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()))
        .setDesc(`Set the ${key}`)
        .addText((text) => {
          const input = text
            .setPlaceholder(key)
            .setValue(this.plugin.settings[key])
            .onChange((value) => {
              this.plugin.settings[key] = value.trim();
              this.plugin.saveSettings();
            });

          if (key.includes("Folder")) {
            const inputEl = input.inputEl;
            if (inputEl) new FolderSuggester(this.app, inputEl);
          }
        });
    });

    // 5. Citation dropdown
    new Setting(containerEl)
      .setName("Citation Style")
      .setDesc("Choose quote formatting style")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("MLA", "MLA")
          .addOption("APA", "APA")
          .addOption("Chicago", "Chicago")
          .setValue(this.plugin.settings.citationStyle)
          .onChange((value) => {
            this.plugin.settings.citationStyle = value as "MLA" | "APA" | "Chicago";
            this.plugin.saveSettings();
          });
      });

    // 6. Boolean toggles
    const toggleKeys = [
      "insertAtTop",
      "includePDFs",
      "enableMetadataFetch",
      "skipMetadataPrompt",
      "deleteAfterImport",
      "logEvents",
      "developerMode",
      "enableAutoScan"
    ] as const;

    toggleKeys.forEach((key) => {
      new Setting(containerEl)
        .setName(key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()))
        .setDesc(`Toggle ${key}`)
        .addToggle((t) => {
          t.setValue(this.plugin.settings[key])
            .onChange((value) => {
              this.plugin.settings[key] = value;
              this.plugin.saveSettings();
            });
        });
    });

    // 6.b Additional toggle options
    new Setting(containerEl)
      .setName("Show Page Numbers")
      .setDesc("Include page numbers in citations")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showPage ?? true)
          .onChange((value) => {
            this.plugin.settings.showPage = value;
            this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Show Timestamps")
      .setDesc("Include timestamp in citation footers")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showTimestamp ?? true)
          .onChange((value) => {
            this.plugin.settings.showTimestamp = value;
            this.plugin.saveSettings();
          });
      });

    // 6.c Optional: Callout map editor
    new Setting(containerEl)
      .setName("Callout Map (Advanced)")
      .setDesc("Customize the annotation symbol → callout type mapping")
      .addTextArea((area) => {
        area
          .setPlaceholder('{ "!": "tip", "@": "info" }')
          .setValue(JSON.stringify(this.plugin.settings.calloutMap, null, 2))
          .onChange((value) => {
            try {
              this.plugin.settings.calloutMap = JSON.parse(value);
              this.plugin.saveSettings();
            } catch (e) {
              console.warn("Invalid callout map JSON");
            }
          });
        area.inputEl.rows = 6;
      });

    // 7. Scan interval (dropdown)
    new Setting(containerEl)
      .setName("Auto-Scan Interval")
      .setDesc("Frequency to auto-scan your Watch folder")
      .addDropdown((dropdown) => {
        const intervals: Record<number, string> = {
          15000: "Every 15 seconds (debug only)",
          30000: "Every 30 seconds",
          60000: "Every 1 minute",
          3600000: "Every hour"
        };
        Object.entries(intervals).forEach(([ms, label]) => {
          dropdown.addOption(ms, label);
        });
        dropdown
          .setValue(String(this.plugin.settings.scanIntervalMs))
          .onChange((value) => {
            const parsed = parseInt(value);
            if (!isNaN(parsed)) {
              this.plugin.settings.scanIntervalMs = parsed;
              this.plugin.saveSettings();
            }
          });
      });
  }
}