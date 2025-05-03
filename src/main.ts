// main.ts
import { Plugin, TFile, TFolder, normalizePath } from "obsidian";
import { BooxSyncSettings, DEFAULT_SETTINGS, BooxSyncSettingTab } from "./settings";
import { parseHighlightFile } from "./parser";
import { ensureDefaultTemplateExists } from "./bookTemplate";

export default class BooxSync extends Plugin {
  settings!: BooxSyncSettings;
  interval: number | null = null;

  async onload() {
    console.log("Boox Sync Plugin loading...");
    await this.loadSettings();

    this.addSettingTab(new BooxSyncSettingTab(this.app, this));

    // ✅ Ensure the default template exists with correct arguments
    await ensureDefaultTemplateExists(
      this.app,
      "Templates/BooxBookTemplate.md",
      this.settings
    );

    this.startWatcher();
  }

  onunload() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    console.log("Boox Sync Plugin unloaded.");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  startWatcher() {
    if (this.interval) clearInterval(this.interval);

    this.interval = window.setInterval(async () => {
      const folderPath = normalizePath(this.settings.booxFolder);
      const folder = this.app.vault.getAbstractFileByPath(folderPath);

      if (!(folder instanceof TFolder)) {
        console.warn(`Boox Sync: Folder not found or not a folder: ${folderPath}`);
        return;
      }

      const txtFiles = folder.children.filter(
        (f): f is TFile => f instanceof TFile && f.extension === "txt"
      );

      for (const file of txtFiles) {
        await parseHighlightFile(this.app, this.settings, file);
      }
    }, this.settings.scanIntervalSeconds * 1000);
  }
}