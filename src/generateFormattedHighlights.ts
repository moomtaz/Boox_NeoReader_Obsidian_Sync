// generateFormattedHighlights.ts
// Purpose: Convert highlights into formatted Obsidian callouts
// Last updated: 2025-05-16 22:00 PDT

import { BooxSyncSettings } from "./settings";
import { ParsedBookMetadata, Highlight } from "./types";

function formatCitation(
  quote: string,
  author: string[],
  title: string,
  page: string | undefined,
  timestamp: string | undefined,
  style: string
): string {
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

const fallbackCalloutMap: Record<string, string> = {
  "!": "tip",
  "@": "info",
  "?": "question",
  "^": "quote",
  "~": "abstract",
  "%": "danger",
  "*": "note"
};

export function generateFormattedHighlights(
  highlights: Highlight[],
  metadata: ParsedBookMetadata,
  settings: BooxSyncSettings
): string {
  const calloutMap = settings.calloutMap ?? fallbackCalloutMap;

  const results = highlights.map((h) => {
    const type = calloutMap[h.label ?? "*"] ?? "note";

    const citation = formatCitation(
      h.text,
      metadata.author,
      metadata.title,
      h.page,
      h.timestamp,
      settings.citationStyle
    );

    let label = "";
    let comment = "";

    if (h.annotation?.includes("|")) {
      [label, comment] = h.annotation.split("|").map(x => x.trim());
    } else {
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