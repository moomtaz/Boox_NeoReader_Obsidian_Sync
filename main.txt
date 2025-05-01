'use strict';

var obsidian = require('obsidian');

// settings.ts
const DEFAULT_SETTINGS = {
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
            .setDesc("Folder to watch for Boox .txt highlight files")
            .addText(text => text
            .setPlaceholder("Templates/Attachments")
            .setValue(this.plugin.settings.booxFolder)
            .onChange(async (value) => {
            this.plugin.settings.booxFolder = value.trim();
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Output Folder for Book Notes")
            .setDesc("Temporary output location for created markdown files")
            .addText(text => text
            .setPlaceholder("Books")
            .setValue(this.plugin.settings.outputFolder)
            .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim();
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Final Destination Folder for Processed Notes")
            .setDesc("Where completed book notes should be moved")
            .addText(text => text
            .setPlaceholder("Books/Library")
            .setValue(this.plugin.settings.moveCompletedTo)
            .onChange(async (value) => {
            this.plugin.settings.moveCompletedTo = value.trim();
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Citation Style")
            .setDesc("Choose the citation format to use in notes")
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
            .setName("Note Naming Format")
            .setDesc("Choose how to name the created note files")
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
            .setDesc("If enabled, also import Boox handwritten notes saved as PDFs")
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.importPDFs)
            .onChange(async (value) => {
            this.plugin.settings.importPDFs = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Enable Online Metadata Fetch")
            .setDesc("Use Google Books to auto-fill frontmatter metadata if missing")
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableMetadataFetch)
            .onChange(async (value) => {
            this.plugin.settings.enableMetadataFetch = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName("Scan Interval (seconds)")
            .setDesc("How often to scan the watch folder for new files")
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
            .setName("Overwrite Template Automatically")
            .setDesc("Recreate BooxBookTemplate.md every time the plugin loads")
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.overwriteTemplate)
            .onChange(async (value) => {
            this.plugin.settings.overwriteTemplate = value;
            await this.plugin.saveSettings();
        }));
    }
}

// bookTemplate.ts
async function loadTemplate(app, metadata) {
    const fm = `---
` +
        `title: ${metadata.title}
` +
        `author: ${metadata.author}
` +
        `publisher: ${metadata.publisher}
` +
        `publishdate: ${metadata.publishDate}
` +
        `pages: ${metadata.totalPage}
` +
        `ISBN10: ${metadata.ISBN10}
` +
        `ISBN13: ${metadata.ISBN13}
` +
        `source: ${metadata.source}
` +
        `url: ${metadata.url}
` +
        `date: ${metadata.date}
` +
        `tags: []
` +
        `rating:
` +
        `date read:
` +
        `status:
` +
        `how read:
` +
        `highlights: ${metadata.highlights || ""}
` +
        `modified: ${new Date().toLocaleString("en-US")}
` +
        `type: ${metadata.type || ""}
` +
        `---`;
    const body = `

[[Favorite Books]] | [[To Read List]]

## Summary

> [!abstract] Summary  
${metadata.description || "No summary available."}

## Thesis

> [!question] Main Points  
> What was the author trying to say?

## Antithesis

> [!question] Disagreements  
> Points you took issue with.

## Synthesis

> [!question] Middle Ground  
> How would you reconcile opposing ideas?

## Related

> [!note] Related Topics

## Highlights

`;
    return fm + body;
}
async function ensureDefaultTemplateExists(app) {
    const templatePath = obsidian.normalizePath("Templates/BookTemplate.md");
    const existing = app.vault.getAbstractFileByPath(templatePath);
    if (!existing) {
        const content = await loadTemplate(app, {
            title: "{ title }",
            author: "{ author }",
            publisher: "{ publisher }",
            publishDate: "{ publishDate }",
            totalPage: "{ totalPage }",
            ISBN10: "{ ISBN10 }",
            ISBN13: "{ ISBN13 }",
            source: "{ source }",
            url: "{ url }",
            date: "{ date }",
            type: "{ type }",
            highlights: "{ highlights }",
            description: "{ description }"
        });
        await app.vault.create(templatePath, content);
    }
}

// parser.ts
const PREFIX_CALLMAP = {
    "!": "warning",
    "@": "tip",
    "?": "question",
    "/": "success",
    "~": "abstract",
    "#": "info",
    "^": "danger",
    '"': "quote",
    "xx": "example"
};
async function fetchBookMetadata(title, author) {
    const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;
    try {
        const response = await obsidian.requestUrl({ url });
        const data = response.json;
        if (!data.items || data.items.length === 0)
            return null;
        const volume = data.items[0].volumeInfo;
        const categories = (volume.categories && volume.categories.join(", ")) || "";
        return {
            title: volume.title || title,
            author: (volume.authors && volume.authors.join(", ")) || author,
            publisher: volume.publisher || "",
            publishDate: volume.publishedDate || "",
            totalPage: volume.pageCount?.toString() || "",
            ISBN10: (volume.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier) || "",
            ISBN13: (volume.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier) || "",
            source: "Google Books",
            url: volume.infoLink || "",
            description: volume.description || "",
            type: categories,
            date: new Date().toISOString().split("T")[0],
            highlights: ""
        };
    }
    catch (err) {
        console.error("Failed to fetch metadata:", err);
        return null;
    }
}
async function parseHighlightFile(plugin, file) {
    const content = await plugin.app.vault.read(file);
    const lines = content.split("\n").map(l => l.trim());
    const metaLine = lines.shift();
    if (!metaLine) {
        new obsidian.Notice(`File ${file.name} is empty or improperly formatted.`);
        return;
    }
    const metaMatch = metaLine.match(/<<(.*?)>>(.*)/);
    if (!metaMatch) {
        new obsidian.Notice(`Invalid highlight file format in ${file.name}`);
        return;
    }
    const title = metaMatch[1].trim();
    const author = metaMatch[2].trim();
    const noteName = plugin.settings.namingConvention === "TitleAuthor" ? `${title} - ${author}` : title;
    const notePath = obsidian.normalizePath(`${plugin.settings.outputFolder}/${noteName}.md`);
    let bookNote = plugin.app.vault.getAbstractFileByPath(notePath);
    let metadata = null;
    if (!bookNote && plugin.settings.enableMetadataFetch) {
        metadata = await fetchBookMetadata(title, author);
    }
    if (!bookNote) {
        if (!metadata) {
            metadata = {
                title,
                author,
                publisher: "",
                publishDate: "",
                totalPage: "",
                ISBN10: "",
                ISBN13: "",
                source: "",
                url: "",
                description: "",
                type: "",
                date: new Date().toISOString().split("T")[0],
                highlights: ""
            };
        }
        const initial = await loadTemplate(plugin.app, metadata);
        bookNote = await plugin.app.vault.create(notePath, initial);
    }
    if (!(bookNote instanceof obsidian.TFile))
        return;
    let existing = await plugin.app.vault.read(bookNote);
    if (metadata?.description) {
        const summaryRegex = /(## Summary\n+> \[!abstract\] Summary\s+)(.*)/i;
        existing = existing.replace(summaryRegex, `$1${metadata.description}`);
        await plugin.app.vault.modify(bookNote, existing);
    }
    let currentBlock = [];
    const parsedBlocks = [];
    for (const line of lines) {
        if (/^[-]{3,}$/.test(line)) {
            if (currentBlock.length)
                parsedBlocks.push(currentBlock.join("\n"));
            currentBlock = [];
        }
        else {
            currentBlock.push(line);
        }
    }
    if (currentBlock.length)
        parsedBlocks.push(currentBlock.join("\n"));
    let added = 0;
    let latestTimestamp = "";
    for (const block of parsedBlocks) {
        const parsed = parseBooxBlock(block);
        if (!parsed.highlight ||
            (existing.includes(parsed.highlight) && existing.includes(parsed.timestamp)))
            continue;
        const quote = formatCitation(plugin.settings.citationStyle, title, author, parsed.page, parsed.highlight, parsed.timestamp);
        let output = `> [!quote]\n> ${quote}\n> *Added on ${new Date(parsed.timestamp).toLocaleString()}*`;
        if (parsed.annotation) {
            const prefixMatch = parsed.annotation.match(/^(\^|\/|@|\?|~|#|!|"|xx)/);
            let prefix = "";
            let content = parsed.annotation;
            if (prefixMatch) {
                prefix = prefixMatch[1];
                content = parsed.annotation.slice(prefix.length).trim();
            }
            const calloutType = PREFIX_CALLMAP[prefix] || "note";
            const [label, annotationBody] = content.split("|").map(p => p.trim());
            output += `\n\n> [!${calloutType}] ${label}\n> ${annotationBody}`;
        }
        await plugin.app.vault.append(bookNote, `\n\n${output}\n`);
        added++;
        if (!latestTimestamp || new Date(parsed.timestamp) > new Date(latestTimestamp)) {
            latestTimestamp = parsed.timestamp;
        }
    }
    if (added > 0 && latestTimestamp) {
        const fileContent = await plugin.app.vault.read(bookNote);
        const updated = fileContent.replace(/(highlights:).*/i, `$1 ${latestTimestamp}`);
        await plugin.app.vault.modify(bookNote, updated);
        new obsidian.Notice(`Added ${added} new highlight(s) to ${noteName}`);
    }
    await plugin.app.vault.delete(file);
    const finalPath = obsidian.normalizePath(`${plugin.settings.moveCompletedTo}/${noteName}.md`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const fresh = plugin.app.vault.getAbstractFileByPath(notePath);
    if (fresh instanceof obsidian.TFile) {
        await plugin.app.fileManager.renameFile(fresh, finalPath);
    }
}
function parseBooxBlock(block) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    let section = "", timestamp = "", page = "", highlight = "", annotation = "";
    if (lines[0] && lines[0].includes("| Page No.:")) {
        const metaLine = lines.shift();
        if (metaLine)
            [timestamp, page] = metaLine.split("| Page No.:").map(s => s.trim());
    }
    else {
        section = lines.shift() || "";
        if (lines[0] && lines[0].includes("| Page No.:")) {
            const metaLine = lines.shift();
            if (metaLine)
                [timestamp, page] = metaLine.split("| Page No.:").map(s => s.trim());
        }
    }
    for (const line of lines) {
        if (line.includes("【Annotation】")) {
            annotation = line.replace("【Annotation】", "").trim();
        }
        else {
            highlight += (highlight ? " " : "") + line;
        }
    }
    return { section, timestamp, page, highlight: highlight.trim(), annotation };
}
function formatCitation(style, title, author, page, highlight, timestamp) {
    switch (style) {
        case "APA":
            return `${author} (${new Date(timestamp).getFullYear()}). *${title}*. \"${highlight}\" p. ${page}.`;
        case "Chicago":
            return `${author}, *${title}* (${page}): \"${highlight}\".`;
        case "MLA":
        default:
            return `${author}. \"${highlight}\" *${title}*, p. ${page}.`;
    }
}

// main.ts
class BooxSync extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.scanIntervalId = null;
    }
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
        this.scanIntervalId = window.setInterval(() => this.scanForImports(), this.settings.scanIntervalSeconds * 1000);
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
        if (!watchFolder || !(watchFolder instanceof obsidian.TFolder)) {
            console.warn(`Boox Sync: Folder not found: ${this.settings.booxFolder}`);
            return;
        }
        for (const file of watchFolder.children) {
            if (file instanceof obsidian.TFile && file.extension === "txt") {
                try {
                    await parseHighlightFile(this, file);
                }
                catch (err) {
                    console.error(`Boox Sync: Failed to process ${file.name}`, err);
                }
            }
            if (this.settings.importPDFs && file instanceof obsidian.TFile && file.extension === "pdf") {
                await this.linkPDFNote(file);
            }
        }
    }
    async linkPDFNote(file) {
        const notePath = `${this.settings.outputFolder}/${file.basename}.md`;
        let bookNote = this.app.vault.getAbstractFileByPath(notePath);
        if (!bookNote) {
            const content = `# ${file.basename}\n\n## Handwritten Notes\n\n![[${file.path}]]\n`;
            await this.app.vault.create(notePath, content);
        }
    }
}

module.exports = BooxSync;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOltdLCJzb3VyY2VzQ29udGVudCI6W10sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsifQ==
