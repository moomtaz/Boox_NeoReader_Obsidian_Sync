// parser.ts
import { TFile, normalizePath, Notice, requestUrl } from "obsidian";
import BooxSync from "./main";
import { CitationStyle } from "./settings";
import { loadTemplate } from "./bookTemplate";

const PREFIX_CALLMAP: Record<string, string> = {
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

async function fetchBookMetadata(title: string, author: string) {
  const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;
  try {
    const response = await requestUrl({ url });
    const data = response.json;
    if (!data.items || data.items.length === 0) return null;

    const volume = data.items[0].volumeInfo;
    const categories = (volume.categories && volume.categories.join(", ")) || "";

    return {
      title: volume.title || title,
      author: (volume.authors && volume.authors.join(", ")) || author,
      publisher: volume.publisher || "",
      publishDate: volume.publishedDate || "",
      totalPage: volume.pageCount?.toString() || "",
      ISBN10: (volume.industryIdentifiers?.find((id: any) => id.type === "ISBN_10")?.identifier) || "",
      ISBN13: (volume.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")?.identifier) || "",
      source: "Google Books",
      url: volume.infoLink || "",
      description: volume.description || "",
      type: categories,
      date: new Date().toISOString().split("T")[0],
      highlights: ""
    };
  } catch (err) {
    console.error("Failed to fetch metadata:", err);
    return null;
  }
}

export async function parseHighlightFile(plugin: BooxSync, file: TFile): Promise<void> {
  const content = await plugin.app.vault.read(file);
  const lines = content.split("\n").map(l => l.trim());

  const metaLine = lines.shift();
  if (!metaLine) {
    new Notice(`File ${file.name} is empty or improperly formatted.`);
    return;
  }
  const metaMatch = metaLine.match(/<<(.*?)>>(.*)/);
  if (!metaMatch) {
    new Notice(`Invalid highlight file format in ${file.name}`);
    return;
  }

  const title = metaMatch[1].trim();
  const author = metaMatch[2].trim();
  const noteName = plugin.settings.namingConvention === "TitleAuthor" ? `${title} - ${author}` : title;
  const notePath = normalizePath(`${plugin.settings.outputFolder}/${noteName}.md`);
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

  if (!(bookNote instanceof TFile)) return;
  let existing = await plugin.app.vault.read(bookNote);

  if (metadata?.description) {
    const summaryRegex = /(## Summary\n+> \[!abstract\] Summary\s+)(.*)/i;
    existing = existing.replace(summaryRegex, `$1${metadata.description}`);
    await plugin.app.vault.modify(bookNote, existing);
  }

  let currentBlock: string[] = [];
  const parsedBlocks: string[] = [];
  for (const line of lines) {
    if (/^[-]{3,}$/.test(line)) {
      if (currentBlock.length) parsedBlocks.push(currentBlock.join("\n"));
      currentBlock = [];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length) parsedBlocks.push(currentBlock.join("\n"));

  let added = 0;
  let latestTimestamp = "";
  for (const block of parsedBlocks) {
    const parsed = parseBooxBlock(block);
if (
  !parsed.highlight ||
  (existing.includes(parsed.highlight) && existing.includes(parsed.timestamp))
) continue;


    const quote = formatCitation(
      plugin.settings.citationStyle,
      title,
      author,
      parsed.page,
      parsed.highlight,
      parsed.timestamp
    );

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
    new Notice(`Added ${added} new highlight(s) to ${noteName}`);
  }

  await plugin.app.vault.delete(file);

  const finalPath = normalizePath(`${plugin.settings.moveCompletedTo}/${noteName}.md`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const fresh = plugin.app.vault.getAbstractFileByPath(notePath);
  if (fresh instanceof TFile) {
    await plugin.app.fileManager.renameFile(fresh, finalPath);
  }
}

function parseBooxBlock(block: string) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
  let section = "", timestamp = "", page = "", highlight = "", annotation = "";

  if (lines[0] && lines[0].includes("| Page No.:")) {
    const metaLine = lines.shift();
    if (metaLine) [timestamp, page] = metaLine.split("| Page No.:").map(s => s.trim());
  } else {
    section = lines.shift() || "";
    if (lines[0] && lines[0].includes("| Page No.:")) {
      const metaLine = lines.shift();
      if (metaLine) [timestamp, page] = metaLine.split("| Page No.:").map(s => s.trim());
    }
  }

  for (const line of lines) {
    if (line.includes("【Annotation】")) {
      annotation = line.replace("【Annotation】", "").trim();
    } else {
      highlight += (highlight ? " " : "") + line;
    }
  }

  return { section, timestamp, page, highlight: highlight.trim(), annotation };
}

function formatCitation(
  style: CitationStyle,
  title: string,
  author: string,
  page: string,
  highlight: string,
  timestamp: string
): string {
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
