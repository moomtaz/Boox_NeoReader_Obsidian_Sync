// main.ts
import { App, Plugin, TFile, TFolder, Notice } from "obsidian";
import { BooxSyncSettings, DEFAULT_SETTINGS, BooxSyncSettingTab } from "./settings";
import { parseHighlightFile } from "./parser";
import { ensureDefaultTemplateExists } from "./bookTemplate";

export default class BooxSync extends Plugin {
  settings!: BooxSyncSettings;
  scanIntervalId: number | null = null;

  async onload() {
    console.log("Boox Sync Plugin loading...");
    await this.loadSettings();
    await ensureDefaultTemplateExists(this.app);

    this.addSettingTab(new BooxSyncSettingTab(this.app, this));
    this.startPolling();
  }

  onunload() {
    this.stopPolling();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.restartPolling();
  }

  startPolling() {
    this.stopPolling();
    this.scanForImports(); // Run immediately on load
    this.scanIntervalId = window.setInterval(
      () => this.scanForImports(),
      this.settings.scanIntervalSeconds * 1000
    );
  }

  stopPolling() {
    if (this.scanIntervalId !== null) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
  }

  restartPolling() {
    this.startPolling();
  }

  async scanForImports() {
    const watchFolder = this.app.vault.getAbstractFileByPath(this.settings.booxFolder);
    if (!watchFolder || !(watchFolder instanceof TFolder)) {
      console.warn(`Boox Sync: Folder not found: ${this.settings.booxFolder}`);
      return;
    }

    for (const file of watchFolder.children) {
      if (file instanceof TFile && file.extension === "txt") {
        try {
          await parseHighlightFile(this, file);
        } catch (err) {
          console.error(`Boox Sync: Failed to process ${file.name}`, err);
        }
      }

      if (this.settings.importPDFs && file instanceof TFile && file.extension === "pdf") {
        await this.linkPDFNote(file);
      }
    }
  }

  async linkPDFNote(file: TFile) {
    const notePath = `${this.settings.outputFolder}/${file.basename}.md`;
    let bookNote = this.app.vault.getAbstractFileByPath(notePath);

    if (!bookNote) {
      const content = `# ${file.basename}\n\n## Handwritten Notes\n\n![[${file.path}]]\n`;
      await this.app.vault.create(notePath, content);
    }
  }
}
