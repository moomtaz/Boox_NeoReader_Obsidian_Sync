// fetchBookMetadataWithFallback.ts
// Last updated: 2025-05-17 00:05 PDT

import { requestUrl } from "obsidian";
import { ParsedBookMetadata } from "./types";
import { promptForManualMetadata } from "./ui/promptForManualMetadata";

export async function fetchBookMetadataWithFallback(
  app: any,
  title: string,
  authors: string[],
  fallbackDate: string
): Promise<ParsedBookMetadata | undefined> {
  const query = encodeURIComponent(`${title} ${authors.join(" ")}`);

  try {
    const response = await requestUrl({
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
      .filter((item: any) => {
        const title = item.volumeInfo?.title?.toLowerCase() ?? "";
        return !["summary", "study guide", "key insights", "milkyway media"].some((term) =>
          title.includes(term)
        );
      })
      .map((item: any): ParsedBookMetadata => {
        const info = item.volumeInfo;
        return {
          title: info.title ?? title,
          author: info.authors ?? authors,
          publisher: info.publisher ?? "",
          publishDate: info.publishedDate ?? "",
          ISBN10: info.industryIdentifiers?.find((i: any) => i.type === "ISBN_10")?.identifier ?? "",
          ISBN13: info.industryIdentifiers?.find((i: any) => i.type === "ISBN_13")?.identifier ?? "",
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

  } catch (err) {
    console.warn("[BooxSync][fetch] ⚠️ Metadata fetch failed, falling back.");
    return await promptForManualMetadata(app, {
      title,
      author: authors,
      date: fallbackDate,
      source: "Manual"
    });
  }
}