// fetchGoogleBooksMetadata.ts — Fetch metadata from Google Books API
// Purpose: Uses title and author to search Google Books and return structured metadata
// Last updated: 2025-05-04 19:22 PDT

// 1. Declarations
import { App } from "obsidian";
import { ParsedBookMetadata } from "./types";
import { appendToLog } from "./logging";

// 2. Function to fetch metadata from Google Books
export async function fetchGoogleBooksMetadata(
  app: App,
  title: string,
  author: string,
  logEvents: boolean,
  logFolder: string
): Promise<ParsedBookMetadata | null> {
  const query = `${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Books returned ${res.status}`);
    const data = await res.json();

    const info = data.items?.[0]?.volumeInfo;
    if (!info) return null;

    return {
      title: info.title || title,
      author: (info.authors || []).join(", ") || author,
      publisher: info.publisher,
      publishDate: info.publishedDate,
      ISBN10: info.industryIdentifiers?.find((id: any) => id.type === "ISBN_10")?.identifier,
      ISBN13: info.industryIdentifiers?.find((id: any) => id.type === "ISBN_13")?.identifier,
      pages: info.pageCount?.toString(),
      cover: info.imageLinks?.thumbnail,
      category: info.categories?.[0],
      description: info.description,
      url: info.infoLink,
      doi: undefined,
      source: "Google Books", // 🛠️ Added to comply with ParsedBookMetadata
      date: new Date().toISOString(), // 🛠️ Added standard fields
      highlights: new Date().toISOString(),
      modified: new Date().toLocaleString(),
    };
  } catch (err) {
    if (logEvents) {
      await appendToLog(app, logFolder, `❌ Google Books error: ${(err as Error).message}`, "ERROR", "METADATA");
    }
    return null;
  }
}