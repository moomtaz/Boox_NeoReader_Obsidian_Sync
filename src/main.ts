// main.ts — Entry point for BooxSync Plugin
// Purpose: Initializes plugin, loads/saves settings, handles file scans and manual book entry
// Last updated: 2025-05-16 22:42 PDT

import { Plugin, normalizePath } from "obsidian";
import { DEFAULT_SETTINGS, BooxSyncSettings, BooxSyncSettingTab } from "./settings";
import { scanForBooxFiles } from "./scanner";
import { resolveFolderPath } from "./utils";
import { promptForManualMetadata } from "./ui/promptForManualMetadata";

export default class BooxSyncPlugin extends Plugin {
  settings!: BooxSyncSettings;
  interval: number | null = null;

  async onload() {
    console.log("[BooxSync][main.ts] 🔄 Plugin loading...");

    await this.loadSettings();
    this.addSettingTab(new BooxSyncSettingTab(this.app, this));

    // 1. Manual Scan Command
    this.addCommand({
      id: "booxsync-scan-now",
      name: "📥 Scan Boox Folder Now",
      callback: async () => {
        console.log("[BooxSync][main.ts] 🔍 Manual scan started.");
        await this.runScan();
      }
    });

    // 2. Manual Metadata Entry for Physical Books
    this.addCommand({
      id: "booxsync-add-book-manually",
      name: "✍️ Add Metadata for Physical Book",
      callback: async () => {
        const metadata = await promptForManualMetadata(this.app, {
          title: "",
          author: [],
          source: "Manual",
          date: new Date().toISOString(),
        });

        if (metadata) {
          const md = `---
title: ${metadata.title}
author: ${metadata.author.join(", ")}
source: ${metadata.source}
date: ${metadata.date}
highlights: ${metadata.date}
modified: ${metadata.modified}
---

[[Favorite Books]] | [[To Read List]]

## Summary

> [!abstract] Summary  
> 

## Thesis

> [!question] What are the main points of the book?  
> What was the author trying to say?

## Antithesis

> [!question] What are some points you took issue with?  
> What did the author miss?

## Highlights

> Your highlights will appear below automatically.
`;

          const path = normalizePath(`Boox/Output/${metadata.title.replace(/[\\/:*?"<>|]/g, "")}.md`);
          await this.app.vault.adapter.write(path, md);
          console.log("[BooxSync][main.ts] ✅ Manual note created at:", path);
        }
      }
    });

    // 3. Enable periodic scanning if setting is active
    if (this.settings.enableAutoScan) {
      const delay = this.settings.scanIntervalMs;
      this.interval = window.setInterval(() => this.runScan(), delay);
      console.log(`[BooxSync][main.ts] ⏱️ Auto-scan every ${delay / 1000}s`);
    }

    await this.runScan(); // Initial scan on plugin load
  }

  onunload() {
    if (this.interval) clearInterval(this.interval);
    console.log("[BooxSync][main.ts] ❎ Plugin unloaded.");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    console.log("[BooxSync][main.ts] ⚙️ Settings loaded:", this.settings);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    console.log("[BooxSync][main.ts] 💾 Settings saved.");
  }

  async runScan() {
    try {
      console.log("[BooxSync][main.ts] 🔍 Starting scan...");
      const watchPath = await resolveFolderPath(this.app, this.settings.watchFolder);
      await scanForBooxFiles(this.app, this.settings);
    } catch (err) {
      console.error("[BooxSync][main.ts] ❌ Error during scan:", err);
    }
  }
}