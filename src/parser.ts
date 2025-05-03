// parser.ts — Updated with Open Library fallback & metadata safety
import { TFile, normalizePath, Notice, requestUrl, App } from "obsidian";
import { CitationStyle, BooxSyncSettings } from "./settings";
import { loadTemplate } from "./bookTemplate";

interface HighlightBlock {
  section: string;
  timestamp: string;
  page: string;
  highlight: string;
  annotation: string;
}

interface ParsedBookMetadata {
  title: string;
  author: string;
  publisher?: string;
  publishDate?: string;
  totalPage?: string;
  ISBN10?: string;
  ISBN13?: string;
  source: string;
  url?: string;
  description?: string;
  type?: string;
  date: string;
  highlights?: string;
  modified?: string;
}

const PREFIX_CALLMAP: Record<string, string> = {
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

export async function parseHighlightFile(app: App, settings: BooxSyncSettings, file: TFile): Promise<void> {
  const content = await app.vault.read(file);
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

  const metaLine = lines.shift();
  if (!metaLine) {
    new Notice(`Empty or invalid file: ${file.name}`);
    return;
  }

  const metaMatch = metaLine.match(/^<<(.+?)>>(.*)$/);
  if (!metaMatch) {
    new Notice(`Invalid format in: ${file.name}`);
    return;
  }

  const title = metaMatch[1].trim();
  const author = metaMatch[2].trim();
  const noteName = settings.namingConvention === "TitleAuthor" ? `${title} - ${author}` : title;
  const notePath = normalizePath(`${settings.outputFolder}/${noteName}.md`);
  const highlightSectionTitle = settings.highlightSectionTitle || "Highlights";

  let noteFile = app.vault.getAbstractFileByPath(notePath) as TFile | null;
  let metadata: ParsedBookMetadata | null = null;

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
    const stringifiedMetadata = Object.fromEntries(
      Object.entries(metadata).map(([k, v]) => [k, v?.toString() ?? ""])
    );
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
    new Notice(`No new highlights for ${title}`);
    return;
  }

  const formatted = deduped.map(h =>
    formatHighlight(settings.citationStyle, title, author, h)
  ).join("\n\n");

  const updatedYaml = noteContent.replace(/^---[\s\S]+?---/, yaml => {
    const lines = yaml.split("\n").map(line => {
      if (line.startsWith("highlights:")) return `highlights: ${metadata?.highlights}`;
      if (line.startsWith("modified:")) return `modified: ${metadata?.modified}`;
      return line;
    });
    return lines.join("\n");
  });

  const final = settings.insertAtTop
    ? `${before}\n\n${formatted}\n\n${currentHighlights.trim()}\n${after}`
    : `${before}\n\n${currentHighlights.trim()}\n\n${formatted}\n${after}`;

console.log("📝 Final note content to write:", final);
  await app.vault.modify(noteFile,  final);
  await app.vault.delete(file);

  new Notice(`Added ${deduped.length} new highlight(s) to ${noteName}`);
}

async function fetchBookMetadata(title: string, author: string): Promise<ParsedBookMetadata | null> {
  const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const res = await requestUrl({ url });
    const json = res.json;

    if (!json.items || json.items.length === 0) throw new Error("No results from Google");

    const info = json.items[0].volumeInfo;
    console.log("📘 Google Volume Info:", info);

    if (!info.publisher || !info.publishedDate || !info.pageCount) {
      console.warn(`⚠️ Incomplete metadata for "${title}", attempting Open Library fallback...`);
      const fallback = await fetchFromOpenLibrary(info.industryIdentifiers?.[0]?.identifier);
      return fallback ?? formatGoogleMetadata(info, title, author);
    }

    return formatGoogleMetadata(info, title, author);
  } catch (err) {
    console.error("❌ Google Books metadata fetch failed:", err);
    return await fetchFromOpenLibrary(); // fallback attempt without ISBN
  }
}

function formatGoogleMetadata(info: any, title: string, author: string): ParsedBookMetadata {
  return {
    title: info.title || title,
    author: (info.authors && info.authors.join(", ")) || author,
    publisher: info.publisher ?? "[Not found]",
    publishDate: info.publishedDate ?? "[Not found]",
    totalPage: info.pageCount?.toString() ?? "[Not found]",
    ISBN10: info.industryIdentifiers?.find((id: any) => id.type === "ISBN_10")?.identifier || "",
    ISBN13: info.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")?.identifier || "",
    source: "Google Books",
    url: info.infoLink || "",
    description: info.description || "",
    type: (info.categories && info.categories.join(", ")) || "",
    date: new Date().toISOString(),
  };
}

async function fetchFromOpenLibrary(isbn?: string): Promise<ParsedBookMetadata | null> {
  if (!isbn) return null;
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;

  try {
    const res = await requestUrl({ url });
    const json = res.json;
    const data = json[`ISBN:${isbn}`];
    if (!data) return null;

    console.log("📚 Open Library Metadata:", data);

    return {
      title: data.title ?? "[Unknown Title]",
      author: data.authors?.map((a: any) => a.name).join(", ") ?? "[Unknown Author]",
      publisher: data.publishers?.map((p: any) => p.name).join(", ") ?? "[Not found]",
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
  } catch (err) {
    console.warn("📕 Open Library fetch failed:", err);
    return null;
  }
}

function extractHighlights(lines: string[]): HighlightBlock[] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^---+$/.test(line)) {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  return blocks.map(parseHighlightBlock);
}

function parseHighlightBlock(block: string[]): HighlightBlock {
  let timestamp = "", page = "", highlight = "", annotation = "";

  if (block[0]?.includes("| Page No.:")) {
    [timestamp, page] = block[0].split("| Page No.:").map(x => x.trim());
    block = block.slice(1);
  }

  for (const line of block) {
    if (line.includes("【Annotation】")) {
      annotation = line.split("【Annotation】")[1]?.trim() || "";
    } else {
      highlight += (highlight ? " " : "") + line.trim();
    }
  }

  return { section: "", timestamp, page, highlight: highlight.trim(), annotation };
}

function formatHighlight(style: CitationStyle, title: string, author: string, data: HighlightBlock): string {
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