'use strict';

var obsidian = require('obsidian');
var fs = require('fs');
var promises = require('fs/promises');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

// FolderSuggester.ts — UI component for fuzzy folder selection
/**
 * FolderSuggester - Modal class to allow fuzzy selection of folders.
 * Triggers when the associated input is clicked (not focused).
 */
class FolderSuggester extends obsidian.FuzzySuggestModal {
    constructor(app, inputEl) {
        super(app);
        this.inputEl = inputEl;
        this.setPlaceholder("Select a folder");
        this.inputEl.title = "Click to select a folder from your vault"; // ✅ Tooltip hint
        // 🔄 Prevent recursive modal calls on focus
        const openModal = () => this.open();
        this.inputEl.addEventListener("click", openModal);
    }
    getItems() {
        const folders = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof obsidian.TFolder);
        // ✅ Fallback message if no folders are found
        if (folders.length === 0) {
            console.warn("[BooxSync][FolderSuggester] ⚠️ No folders found in vault.");
        }
        return folders;
    }
    getItemText(item) {
        return item.path;
    }
    onChooseItem(item) {
        this.inputEl.value = item.path;
        this.inputEl.dispatchEvent(new Event("input"));
        this.close();
    }
}

// settings.ts — BooxSync Settings Tab
// 2. Defaults
const DEFAULT_SETTINGS = {
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
class BooxSyncSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
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
        ];
        stringKeys.forEach((key) => {
            new obsidian.Setting(containerEl)
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
                    if (inputEl)
                        new FolderSuggester(this.app, inputEl);
                }
            });
        });
        // 5. Citation dropdown
        new obsidian.Setting(containerEl)
            .setName("Citation Style")
            .setDesc("Choose quote formatting style")
            .addDropdown((dropdown) => {
            dropdown
                .addOption("MLA", "MLA")
                .addOption("APA", "APA")
                .addOption("Chicago", "Chicago")
                .setValue(this.plugin.settings.citationStyle)
                .onChange((value) => {
                this.plugin.settings.citationStyle = value;
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
        ];
        toggleKeys.forEach((key) => {
            new obsidian.Setting(containerEl)
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
        new obsidian.Setting(containerEl)
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
        new obsidian.Setting(containerEl)
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
        new obsidian.Setting(containerEl)
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
                }
                catch (e) {
                    console.warn("Invalid callout map JSON");
                }
            });
            area.inputEl.rows = 6;
        });
        // 7. Scan interval (dropdown)
        new obsidian.Setting(containerEl)
            .setName("Auto-Scan Interval")
            .setDesc("Frequency to auto-scan your Watch folder")
            .addDropdown((dropdown) => {
            const intervals = {
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

// utils.ts — Utility functions for BooxSync Plugin
// 1. Resolve or create folder path (case-insensitive)
async function resolveOrCreateFolder(app, inputPath) {
    const path = obsidian.normalizePath(inputPath.trim());
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof obsidian.TFolder)
        return file;
    if (!file) {
        await app.vault.createFolder(path);
        const created = app.vault.getAbstractFileByPath(path);
        if (created instanceof obsidian.TFolder)
            return created;
    }
    throw new Error(`❌ Path "${path}" exists but is not a folder.`);
}
// 2. Get all .txt files in a folder
function getTXTFilesInFolder(app, folderPath) {
    const normalized = obsidian.normalizePath(folderPath.trim());
    return app.vault.getFiles().filter((f) => f.extension === "txt" && obsidian.normalizePath(f.path).startsWith(normalized));
}
// 5. Resolve a folder path and return its actual path (not object)
async function resolveFolderPath(app, path) {
    const folder = await resolveOrCreateFolder(app, path);
    return folder.path;
}

// parser.ts
// Purpose: Extract metadata and structured highlights from a Boox TXT file
// Last updated: 2025-05-16 22:00 PDT
async function parseBooxTXTFile(file, vault) {
    console.log("[BooxSync][parser.ts] 🔍 Parsing file:", file.path);
    const content = await vault.read(file);
    const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim()) // ⬅️ This is the line you want to edit
        .filter(Boolean);
    if (lines.length === 0)
        throw new Error("File is empty or unreadable.");
    const firstLine = lines[0].replace(/\u00A0/g, ' ').trim();
    let title = "Unknown Title";
    let author = ["Unknown"];
    const match = firstLine.match(/<<(.+?)>>\s*(.+)/);
    if (match) {
        title = match[1].trim();
        author = [match[2].trim()];
    }
    else {
        console.warn("[BooxSync][parser.ts] ⚠️ Metadata not parsed — falling back to filename.");
        title = file.basename.replace(/\.txt$/, "");
    }
    const body = lines.slice(1).join("\n");
    const highlightBlocks = body.split(/---+/).map(block => block.trim()).filter(Boolean);
    const highlights = [];
    for (const block of highlightBlocks) {
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2)
            continue;
        const timestampLine = lines[0];
        const timestampMatch = timestampLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s+\|\s+Page No\.: (\d+)/);
        const timestamp = timestampMatch?.[1];
        const page = timestampMatch?.[2];
        if (!timestamp || !page)
            continue;
        const textLine = lines.find(l => !l.startsWith("【Annotation】") && l !== timestampLine);
        if (!textLine)
            continue;
        const annotationLine = lines.find(l => l.startsWith("【Annotation】")) || "";
        let label;
        let annotation;
        const annotationMatch = annotationLine.match(/【Annotation】([!@?^~%*]?)\s*(.+)?/);
        if (annotationMatch) {
            label = annotationMatch[1] || undefined;
            annotation = annotationMatch[2]?.trim() || undefined;
        }
        highlights.push({ text: textLine, annotation, label, page, timestamp });
    }
    return { title, author, highlights };
}

// bookTemplate.ts — Loads and injects a Markdown template with enriched metadata
// 2. Fallback default template
const DEFAULT_TEMPLATE = `---
title: {{title}}
author: {{author}}
category: {{category}}
publisher: {{publisher}}
publishdate: {{publishDate}}
doi: {{doi}}
url: {{url}}
ISBN10: {{ISBN10}}
ISBN13: {{ISBN13}}
source: {{source}}
date: {{date}}
highlights: {{highlights}}
modified: {{modified}}
---

[[Favorite Books]] | [[To Read List]]

## Summary

> [!abstract] Summary  
 {{description}}

## Thesis

> [!question] What are the main points of the book?  
> What was the author trying to say?

## Antithesis

> [!question] What are some points you took issue with?  
> What did the author miss?

## {{highlightSectionTitle}}


`;
// 4. Load and fill template with metadata
async function loadTemplate(app, metadata, settings) {
    try {
        const folderPath = await resolveFolderPath(app, settings.templateFolder);
        const filePath = obsidian.normalizePath(`${folderPath}/default-template.md`);
        const file = app.vault.getAbstractFileByPath(filePath);
        let template = file && file instanceof obsidian.TFile
            ? await app.vault.read(file)
            : DEFAULT_TEMPLATE;
        if (!file) {
            console.warn("[BooxSync][bookTemplate.ts] ⚠️ No template file found, using fallback.");
        }
        // Replace all placeholders
        for (const [key, value] of Object.entries(metadata)) {
            template = template.replaceAll(`{{${key}}}`, value || "");
        }
        // Ensure highlight section title placeholder is replaced
        const highlightSection = settings.highlightSectionTitle?.trim() || "Highlights";
        template = template.replace(/{{highlightSectionTitle}}/g, highlightSection);
        // Clean up unused placeholders
        template = template.replace(/{{[^}]+}}/g, "");
        return template;
    }
    catch (err) {
        console.error("[BooxSync][bookTemplate.ts] ❌ Error loading template:", err);
        return DEFAULT_TEMPLATE.replace(/{{highlightSectionTitle}}/g, "Highlights");
    }
}

// generateFormattedHighlights.ts
// Purpose: Convert highlights into formatted Obsidian callouts
// Last updated: 2025-05-16 22:00 PDT
function formatCitation(quote, author, title, page, timestamp, style) {
    const formattedDate = timestamp ? new Date(timestamp).toLocaleString() : "";
    const authorStr = author.join(", ");
    switch (style) {
        case "APA":
            return `${authorStr} (${new Date().getFullYear()}). *${title}*, p. ${page ?? "?"}.\n> *Added on ${formattedDate}*`;
        case "Chicago":
            return `${authorStr}. *${title}*. p. ${page ?? "?"}.\n> *Added on ${formattedDate}*`;
        case "MLA":
        default:
            return `${authorStr}. "${quote}" *${title}*, p. ${page ?? "?"}.\n> *Added on ${formattedDate}*`;
    }
}
const fallbackCalloutMap = {
    "!": "tip",
    "@": "info",
    "?": "question",
    "^": "quote",
    "~": "abstract",
    "%": "danger",
    "*": "note"
};
function generateFormattedHighlights(highlights, metadata, settings) {
    const calloutMap = settings.calloutMap ?? fallbackCalloutMap;
    const results = highlights.map((h) => {
        const type = calloutMap[h.label ?? "*"] ?? "note";
        const citation = formatCitation(h.text, metadata.author, metadata.title, h.page, h.timestamp, settings.citationStyle);
        let label = "";
        let comment = "";
        if (h.annotation?.includes("|")) {
            [label, comment] = h.annotation.split("|").map(x => x.trim());
        }
        else {
            comment = h.annotation ?? "";
        }
        const body = `> [!quote]\n> ${citation}`;
        const annotation = comment
            ? `\n\n> [!${type}]${label ? " " + label : ""}\n> ${comment}`
            : "";
        return {
            timestamp: h.timestamp ?? "",
            block: `${body}${annotation}`
        };
    });
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return results.map(r => r.block).join("\n\n");
}

// MetadataPromptModal.ts — Manual fallback metadata input UI
// 2. Modal Class Definition
class MetadataPromptModal extends obsidian.Modal {
    constructor(app, initial, onSubmit) {
        super(app);
        this.defaultMetadata = initial;
        this.onSubmit = onSubmit;
    }
    // 2.a UI Construction
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "📚 Enter Book Metadata" });
        // Title Input
        new obsidian.Setting(contentEl)
            .setName("Title")
            .addText((text) => text
            .setPlaceholder("e.g. Flow")
            .setValue(this.defaultMetadata.title)
            .onChange((value) => (this.defaultMetadata.title = value.trim())));
        // Author Input (semicolon-separated)
        new obsidian.Setting(contentEl)
            .setName("Author(s)")
            .setDesc("Separate authors with semicolons (;) to preserve commas in names.")
            .addText((text) => text
            .setPlaceholder("Irene A. Stafford, M.D.; Kimberly A. Workowski, M.D.")
            .setValue(this.defaultMetadata.author?.join("; ") || "")
            .onChange((value) => {
            this.defaultMetadata.author = value
                .split(";")
                .map((name) => name.trim())
                .filter((name) => name.length > 0);
        }));
        // Buttons
        const buttonRow = contentEl.createDiv({ cls: "booxsync-modal-buttons" });
        new obsidian.ButtonComponent(buttonRow)
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
            if (!this.defaultMetadata.title.trim()) {
                new obsidian.Setting(contentEl).setDesc("⚠️ Title cannot be empty.");
                return;
            }
            this.defaultMetadata.source = "Manual";
            this.defaultMetadata.date = new Date().toISOString();
            this.defaultMetadata.highlights = new Date().toISOString();
            this.defaultMetadata.modified = new Date().toLocaleString();
            this.close();
            this.onSubmit(this.defaultMetadata, false);
        });
        new obsidian.ButtonComponent(buttonRow)
            .setButtonText("Skip Enrichment")
            .onClick(() => {
            this.close();
            this.onSubmit(null, true);
        });
    }
    onClose() {
        this.contentEl.empty();
    }
}

// promptForManualMetadata.ts — Promise wrapper for MetadataPromptModal
function promptForManualMetadata(app, initial) {
    return new Promise((resolve) => {
        const modal = new MetadataPromptModal(app, initial, (result, skip) => {
            if (skip) {
                resolve(undefined);
            }
            else {
                resolve(result ?? undefined);
            }
        });
        modal.open();
    });
}

// fetchBookMetadataWithFallback.ts
async function fetchBookMetadataWithFallback(app, title, authors, fallbackDate) {
    const query = encodeURIComponent(`${title} ${authors.join(" ")}`);
    try {
        const response = await obsidian.requestUrl({
            url: `https://www.googleapis.com/books/v1/volumes?q=${query}`,
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        console.log("[BooxSync][fetch] 🌐 Raw Google response JSON:", response?.json);
        const items = response?.json?.items;
        if (!items || items.length === 0) {
            console.warn("[BooxSync][fetch] ⚠️ No items returned from Google Books.");
            return await promptForManualMetadata(app, {
                title,
                author: authors,
                date: fallbackDate,
                source: "Manual"
            });
        }
        // Filter out summaries/study guides
        const filtered = items
            .filter((item) => {
            const title = item.volumeInfo?.title?.toLowerCase() ?? "";
            return !["summary", "study guide", "key insights", "milkyway media"].some((term) => title.includes(term));
        })
            .map((item) => {
            const info = item.volumeInfo;
            return {
                title: info.title ?? title,
                author: info.authors ?? authors,
                publisher: info.publisher ?? "",
                publishDate: info.publishedDate ?? "",
                ISBN10: info.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier ?? "",
                ISBN13: info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ?? "",
                category: (info.categories && info.categories[0]) ?? "",
                description: info.description ?? "",
                url: info.infoLink ?? "",
                source: "Google Books",
                date: fallbackDate,
                highlights: fallbackDate,
                modified: new Date().toLocaleString()
            };
        });
        if (filtered.length === 0) {
            console.warn("[BooxSync][fetch] ⚠️ No usable metadata found, launching manual input modal.");
            return await promptForManualMetadata(app, {
                title,
                author: authors,
                date: fallbackDate,
                source: "Manual"
            });
        }
        // Only show prompt if multiple real matches
        if (filtered.length === 1) {
            return filtered[0];
        }
        // TODO: Later—launch SelectMetadataModal if multiple valid
        return filtered[0]; // Default to first good match
    }
    catch (err) {
        console.warn("[BooxSync][fetch] ⚠️ Metadata fetch failed, falling back.");
        return await promptForManualMetadata(app, {
            title,
            author: authors,
            date: fallbackDate,
            source: "Manual"
        });
    }
}

// scanner.ts
async function scanForBooxFiles(app, settings) {
    const vault = app.vault;
    const watchFolder = obsidian.normalizePath(settings.watchFolder);
    const outputFolder = obsidian.normalizePath(settings.outputFolder);
    const txtFiles = await getTXTFilesInFolder(app, watchFolder);
    console.log("[BooxSync][scanner.ts] 🔎 Scanning folder:", watchFolder);
    for (const file of txtFiles) {
        const fullPath = `${app.vault.adapter.basePath}/${file.path}`;
        if (file.basename.endsWith(".done")) {
            console.log("[BooxSync][scanner.ts] ✅ Skipping already processed file:", file.name);
            continue;
        }
        try {
            const parsed = await parseBooxTXTFile(file, vault);
            console.log("[BooxSync][scanner.ts] ✅ Parsed file:", parsed.title);
            const now = new Date();
            let enriched;
            if (settings.enableMetadataFetch) {
                enriched = await fetchBookMetadataWithFallback(app, parsed.title, parsed.author, now.toISOString());
            }
            if (!enriched) {
                console.warn("[BooxSync][scanner.ts] ❌ No metadata returned. Launching manual modal...");
                enriched = await promptForManualMetadata(app, {
                    title: parsed.title,
                    author: parsed.author,
                    date: now.toISOString(),
                    source: "Manual",
                    highlights: now.toISOString(),
                    modified: now.toLocaleString()
                });
                if (!enriched) {
                    console.warn("[BooxSync][scanner.ts] ❌ User skipped manual entry. Skipping file:", file.name);
                    continue;
                }
            }
            const metadata = {
                title: enriched.title,
                author: enriched.author.join(", "),
                category: enriched.category ?? "",
                publisher: enriched.publisher ?? "",
                publishDate: enriched.publishDate ?? "",
                doi: enriched.doi ?? "",
                url: enriched.url ?? "",
                ISBN10: enriched.ISBN10 ?? "",
                ISBN13: enriched.ISBN13 ?? "",
                source: enriched.source ?? "Boox",
                description: enriched.description ?? "",
                date: enriched.date,
                highlights: enriched.highlights ?? now.toISOString(),
                modified: enriched.modified ?? now.toLocaleString(),
            };
            let content = await loadTemplate(app, metadata, settings);
            const highlightSection = settings.highlightSectionTitle?.trim() || "Highlights";
            const insertMarker = `## ${highlightSection}`;
            const formattedHighlights = generateFormattedHighlights(parsed.highlights, {
                title: enriched.title,
                author: enriched.author,
                date: enriched.date,
                source: enriched.source
            }, settings);
            if (content.includes(insertMarker)) {
                content = content.replace(insertMarker, `${insertMarker}\n\n${formattedHighlights}`);
            }
            else {
                content += `\n\n## ${highlightSection}\n\n${formattedHighlights}`;
            }
            const sanitizedTitle = enriched.title.replace(/[\\/:*?"<>|]/g, '');
            const outputFileName = `${sanitizedTitle}.md`;
            const outputPath = obsidian.normalizePath(`${outputFolder}/${outputFileName}`);
            await app.vault.adapter.write(outputPath, content);
            console.log("[BooxSync][scanner.ts] 📝 Wrote MD file to:", outputPath);
            const newFilePath = file.path.replace(/\.txt$/, `.done.txt`);
            const newFullPath = `${app.vault.adapter.basePath}/${newFilePath}`;
            try {
                await promises.rename(fullPath, newFullPath);
                console.log("[BooxSync][scanner.ts] 📁 Renamed processed file to:", newFilePath);
            }
            catch (err) {
                console.warn("[BooxSync][scanner.ts] ⚠️ Failed to rename file:", err.message);
            }
        }
        catch (err) {
            console.error("[BooxSync][scanner.ts] ❌ Error processing file:", file.name, err);
        }
        if (fs__default["default"].existsSync(fullPath)) {
            try {
                await promises.unlink(fullPath);
                console.log("[BooxSync][scanner.ts] 🗑️ Deleted original file:", fullPath);
            }
            catch (err) {
                console.warn("[BooxSync][scanner.ts] ⚠️ Could not delete file:", fullPath, err.message);
            }
        }
        else {
            console.log("[BooxSync][scanner.ts] ⚠️ File already missing or moved:", fullPath);
        }
    }
    console.log("[BooxSync][scanner.ts] ✅ Finished scanning.");
}

// main.ts — Entry point for BooxSync Plugin
class BooxSyncPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.interval = null;
    }
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
                    const path = obsidian.normalizePath(`Boox/Output/${metadata.title.replace(/[\\/:*?"<>|]/g, "")}.md`);
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
        if (this.interval)
            clearInterval(this.interval);
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
        }
        catch (err) {
            console.error("[BooxSync][main.ts] ❌ Error during scan:", err);
        }
    }
}

module.exports = BooxSyncPlugin;
//# sourceMappingURL=main.js.map
