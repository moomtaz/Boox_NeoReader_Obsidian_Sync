'use strict';

var obsidian = require('obsidian');

// settings.ts — 2025-05-02
const DEFAULT_SETTINGS = {
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
class FolderSuggestModal extends obsidian.FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
    }
    getItems() {
        const folders = [];
        const walk = (folder) => {
            folders.push(folder);
            for (const child of folder.children) {
                if (child instanceof obsidian.TFolder)
                    walk(child);
            }
        };
        walk(this.app.vault.getRoot());
        return folders;
    }
    getItemText(item) {
        return item.path;
    }
    onChooseItem(item) {
        this.onChoose(item);
    }
}
class BooxSyncSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Boox Sync Plugin Settings" });
        new obsidian.Setting(containerEl)
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
        new obsidian.Setting(containerEl)
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
        new obsidian.Setting(containerEl)
            .setName("Citation Style")
            .setDesc("Format used for quoted highlights")
            .addDropdown(drop => drop
            .addOption("MLA", "MLA")
            .addOption("APA", "APA")
            .addOption("Chicago", "Chicago")
            .setValue(this.plugin.settings.citationStyle)
            .onChange(async (value) => {
            this.plugin.settings.citationStyle = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Note Naming Convention")
            .setDesc("How book notes are named")
            .addDropdown(drop => drop
            .addOption("TitleAuthor", "Title - Author")
            .addOption("TitleOnly", "Title Only")
            .setValue(this.plugin.settings.namingConvention)
            .onChange(async (value) => {
            this.plugin.settings.namingConvention = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Import Handwritten PDFs")
            .setDesc("Enable importing .pdfs from Boox")
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.importPDFs)
            .onChange(async (value) => {
            this.plugin.settings.importPDFs = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Enable Metadata Fetch")
            .setDesc("Use Google Books to auto-fill metadata")
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableMetadataFetch)
            .onChange(async (value) => {
            this.plugin.settings.enableMetadataFetch = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Scan Interval (seconds)")
            .setDesc("Interval to scan folder for new files")
            .addText(text => text
            .setPlaceholder("60")
            .setValue(this.plugin.settings.scanIntervalSeconds.toString())
            .onChange(async (value) => {
            const parsed = parseInt(value);
            if (!isNaN(parsed)) {
                this.plugin.settings.scanIntervalSeconds = parsed;
                await this.plugin.saveSettings();
            }
        }));
        new obsidian.Setting(containerEl)
            .setName("Highlights Section Title")
            .setDesc("Custom heading for highlight section")
            .addText(text => text
            .setPlaceholder("Highlights")
            .setValue(this.plugin.settings.highlightSectionTitle)
            .onChange(async (value) => {
            this.plugin.settings.highlightSectionTitle = value.trim() || "Highlights";
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("YAML Fields to Include")
            .setDesc("Comma-separated YAML keys to include in frontmatter")
            .addText(text => text
            .setPlaceholder("title, author, type, etc.")
            .setValue(this.plugin.settings.includedYamlFields.join(", "))
            .onChange(async (value) => {
            this.plugin.settings.includedYamlFields = value
                .split(",")
                .map(f => f.trim())
                .filter(f => f.length > 0);
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Insert Highlights at Top")
            .setDesc("Whether to insert new highlights before or after existing ones")
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.insertAtTop)
            .onChange(async (value) => {
            this.plugin.settings.insertAtTop = value;
            await this.plugin.saveSettings();
        }));
    }
}

// bookTemplate.ts
function generateDefaultTemplate(settings) {
    return [
        "---",
        ...settings.includedYamlFields.map(key => `${key}:`),
        "---",
        "",
        "[[Favorite Books]] | [[To Read List]]",
        "",
        "## Summary",
        "",
        "> [!abstract] Summary",
        "> {description}",
        "",
        "## Thesis",
        "",
        "> [!question] Main Points",
        "> What was the author trying to say?",
        "",
        "## Antithesis",
        "",
        "> [!question] Disagreements",
        "> Points you took issue with.",
        "",
        "## Synthesis",
        "",
        "> [!question] Middle Ground",
        "> How would you reconcile opposing ideas?",
        "",
        "## Related",
        "",
        "> [!note] Related Topics",
        "",
        `## ${settings.highlightSectionTitle}`,
        ""
    ].join("\n");
}
async function ensureDefaultTemplateExists(app, path, settings) {
    const exists = app.vault.getAbstractFileByPath(obsidian.normalizePath(path));
    if (!exists) {
        const template = generateDefaultTemplate(settings);
        await app.vault.create(obsidian.normalizePath(path), template);
    }
}
async function loadTemplate(app, metadata, settings) {
    const yamlLines = [`---`];
    for (const key of settings.includedYamlFields) {
        const safeValue = metadata[key] ?? "";
        yamlLines.push(`${key}: ${safeValue}`);
    }
    yamlLines.push(`---`);
    return [
        yamlLines.join("\n"),
        "",
        "[[Favorite Books]] | [[To Read List]]",
        "",
        "## Summary",
        "",
        "> [!abstract] Summary",
        `> ${metadata.description || "Contents"}`,
        "",
        "## Thesis",
        "",
        "> [!question] Main Points",
        "> What was the author trying to say?",
        "",
        "## Antithesis",
        "",
        "> [!question] Disagreements",
        "> Points you took issue with.",
        "",
        "## Synthesis",
        "",
        "> [!question] Middle Ground",
        "> How would you reconcile opposing ideas?",
        "",
        "## Related",
        "",
        "> [!note] Related Topics",
        "",
        `## ${settings.highlightSectionTitle}`,
        ""
    ].join("\n");
}

// parser.ts — Updated with Open Library fallback & metadata safety
const PREFIX_CALLMAP = {
    "!": "warning",
    "@": "tip",
    "?": "question",
    "/": "success",
    "~": "abstract",
    "#": "info",
    "^": "danger",
    "\"": "quote",
    "xx": "example"
};
async function parseHighlightFile(app, settings, file) {
    const content = await app.vault.read(file);
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
    const metaLine = lines.shift();
    if (!metaLine) {
        new obsidian.Notice(`Empty or invalid file: ${file.name}`);
        return;
    }
    const metaMatch = metaLine.match(/^<<(.+?)>>(.*)$/);
    if (!metaMatch) {
        new obsidian.Notice(`Invalid format in: ${file.name}`);
        return;
    }
    const title = metaMatch[1].trim();
    const author = metaMatch[2].trim();
    const noteName = settings.namingConvention === "TitleAuthor" ? `${title} - ${author}` : title;
    const notePath = obsidian.normalizePath(`${settings.outputFolder}/${noteName}.md`);
    const highlightSectionTitle = settings.highlightSectionTitle || "Highlights";
    let noteFile = app.vault.getAbstractFileByPath(notePath);
    let metadata = null;
    if (!noteFile && settings.enableMetadataFetch) {
        metadata = await fetchBookMetadata(title, author);
    }
    if (!metadata) {
        metadata = {
            title,
            author,
            source: "Boox TXT File",
            date: new Date().toISOString(),
        };
    }
    metadata.highlights = new Date().toISOString();
    metadata.modified = new Date().toLocaleString();
    if (!noteFile) {
        const stringifiedMetadata = Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, v?.toString() ?? ""]));
        const initial = await loadTemplate(app, stringifiedMetadata, settings);
        noteFile = await app.vault.create(notePath, initial);
    }
    const noteContent = await app.vault.read(noteFile);
    const highlightHeader = `## ${highlightSectionTitle}`;
    const headerIndex = noteContent.indexOf(highlightHeader);
    let before = noteContent;
    let after = "";
    let currentHighlights = "";
    if (headerIndex !== -1) {
        const [pre, ...rest] = noteContent.split(highlightHeader);
        before = pre + highlightHeader;
        const restContent = rest.join(highlightHeader);
        const nextSectionIndex = restContent.search(/^##\s+/m);
        currentHighlights = nextSectionIndex === -1 ? restContent : restContent.slice(0, nextSectionIndex);
        after = nextSectionIndex === -1 ? "" : restContent.slice(nextSectionIndex);
    }
    const newHighlights = extractHighlights(lines);
    const deduped = newHighlights.filter((h) => {
        const newFormatted = formatHighlight(settings.citationStyle, title, author, h)
            .replace(/\s+/g, " ") // normalize whitespace
            .trim();
        const normalizedCurrent = currentHighlights.replace(/\s+/g, " ");
        console.log("🔍 Checking highlight:", newFormatted);
        return !normalizedCurrent.includes(newFormatted);
    });
    if (deduped.length === 0) {
        new obsidian.Notice(`No new highlights for ${title}`);
        return;
    }
    const formatted = deduped.map(h => formatHighlight(settings.citationStyle, title, author, h)).join("\n\n");
    noteContent.replace(/^---[\s\S]+?---/, yaml => {
        const lines = yaml.split("\n").map(line => {
            if (line.startsWith("highlights:"))
                return `highlights: ${metadata?.highlights}`;
            if (line.startsWith("modified:"))
                return `modified: ${metadata?.modified}`;
            return line;
        });
        return lines.join("\n");
    });
    const final = settings.insertAtTop
        ? `${before}\n\n${formatted}\n\n${currentHighlights.trim()}\n${after}`
        : `${before}\n\n${currentHighlights.trim()}\n\n${formatted}\n${after}`;
    console.log("📝 Final note content to write:", final);
    await app.vault.modify(noteFile, final);
    await app.vault.delete(file);
    new obsidian.Notice(`Added ${deduped.length} new highlight(s) to ${noteName}`);
}
async function fetchBookMetadata(title, author) {
    const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;
    try {
        const res = await obsidian.requestUrl({ url });
        const json = res.json;
        if (!json.items || json.items.length === 0)
            throw new Error("No results from Google");
        const info = json.items[0].volumeInfo;
        console.log("📘 Google Volume Info:", info);
        if (!info.publisher || !info.publishedDate || !info.pageCount) {
            console.warn(`⚠️ Incomplete metadata for "${title}", attempting Open Library fallback...`);
            const fallback = await fetchFromOpenLibrary(info.industryIdentifiers?.[0]?.identifier);
            return fallback ?? formatGoogleMetadata(info, title, author);
        }
        return formatGoogleMetadata(info, title, author);
    }
    catch (err) {
        console.error("❌ Google Books metadata fetch failed:", err);
        return await fetchFromOpenLibrary(); // fallback attempt without ISBN
    }
}
function formatGoogleMetadata(info, title, author) {
    return {
        title: info.title || title,
        author: (info.authors && info.authors.join(", ")) || author,
        publisher: info.publisher ?? "[Not found]",
        publishDate: info.publishedDate ?? "[Not found]",
        totalPage: info.pageCount?.toString() ?? "[Not found]",
        ISBN10: info.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier || "",
        ISBN13: info.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier || "",
        source: "Google Books",
        url: info.infoLink || "",
        description: info.description || "",
        type: (info.categories && info.categories.join(", ")) || "",
        date: new Date().toISOString(),
    };
}
async function fetchFromOpenLibrary(isbn) {
    if (!isbn)
        return null;
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
    try {
        const res = await obsidian.requestUrl({ url });
        const json = res.json;
        const data = json[`ISBN:${isbn}`];
        if (!data)
            return null;
        console.log("📚 Open Library Metadata:", data);
        return {
            title: data.title ?? "[Unknown Title]",
            author: data.authors?.map((a) => a.name).join(", ") ?? "[Unknown Author]",
            publisher: data.publishers?.map((p) => p.name).join(", ") ?? "[Not found]",
            publishDate: data.publish_date ?? "[Not found]",
            totalPage: data.number_of_pages?.toString() ?? "[Not found]",
            ISBN10: isbn.length === 10 ? isbn : "",
            ISBN13: isbn.length === 13 ? isbn : "",
            source: "Open Library",
            url: data.url ?? "",
            description: data.notes ?? "",
            type: "",
            date: new Date().toISOString(),
        };
    }
    catch (err) {
        console.warn("📕 Open Library fetch failed:", err);
        return null;
    }
}
function extractHighlights(lines) {
    const blocks = [];
    let current = [];
    for (const line of lines) {
        if (/^---+$/.test(line)) {
            if (current.length)
                blocks.push(current);
            current = [];
        }
        else {
            current.push(line);
        }
    }
    if (current.length)
        blocks.push(current);
    return blocks.map(parseHighlightBlock);
}
function parseHighlightBlock(block) {
    let timestamp = "", page = "", highlight = "", annotation = "";
    if (block[0]?.includes("| Page No.:")) {
        [timestamp, page] = block[0].split("| Page No.:").map(x => x.trim());
        block = block.slice(1);
    }
    for (const line of block) {
        if (line.includes("【Annotation】")) {
            annotation = line.split("【Annotation】")[1]?.trim() || "";
        }
        else {
            highlight += (highlight ? " " : "") + line.trim();
        }
    }
    return { section: "", timestamp, page, highlight: highlight.trim(), annotation };
}
function formatHighlight(style, title, author, data) {
    const { page, highlight, timestamp, annotation } = data;
    const dateFormatted = timestamp ? new Date(timestamp).toLocaleString() : "Unknown Date";
    const citation = style === "APA"
        ? `${author} (${new Date().getFullYear()}). *${title}*. "${highlight}" p. ${page}.`
        : style === "Chicago"
            ? `${author}, *${title}* (${page}): "${highlight}".`
            : `${author}. "${highlight}" *${title}*, p. ${page}.`;
    const quoteBlock = `> [!quote]\n> ${citation}\n> *Added on ${dateFormatted}*`;
    let annotationBlock = "";
    if (annotation) {
        const [prefix, comment] = annotation.split("|").map(s => s.trim());
        const symbol = prefix?.[0] ?? "";
        const label = prefix?.slice(1).trim() || "Note";
        const content = comment || prefix?.slice(1).trim() || "No comment";
        const type = PREFIX_CALLMAP[symbol] || "note";
        annotationBlock = `\n\n> [!${type}] ${label}\n> ${content}`;
    }
    return `${quoteBlock}${annotationBlock}`;
}

// main.ts
class BooxSync extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.interval = null;
    }
    async onload() {
        console.log("Boox Sync Plugin loading...");
        await this.loadSettings();
        this.addSettingTab(new BooxSyncSettingTab(this.app, this));
        // ✅ Ensure the default template exists with correct arguments
        await ensureDefaultTemplateExists(this.app, "Templates/BooxBookTemplate.md", this.settings);
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
        if (this.interval)
            clearInterval(this.interval);
        this.interval = window.setInterval(async () => {
            const folderPath = obsidian.normalizePath(this.settings.booxFolder);
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!(folder instanceof obsidian.TFolder)) {
                console.warn(`Boox Sync: Folder not found or not a folder: ${folderPath}`);
                return;
            }
            const txtFiles = folder.children.filter((f) => f instanceof obsidian.TFile && f.extension === "txt");
            for (const file of txtFiles) {
                await parseHighlightFile(this.app, this.settings, file);
            }
        }, this.settings.scanIntervalSeconds * 1000);
    }
}

module.exports = BooxSync;
//# sourceMappingURL=main.js.map
