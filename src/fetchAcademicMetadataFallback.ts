// fetchAcademicMetadataFallback.ts — Manual fallback for academic or medical article metadata
// Purpose: Provides a structured fallback for parsing journal or PDF-style exports when Google Books fails
// Last updated: 2025-05-07 13:24 PDT (BooxSync v0.1.7)

// 1. Imports
import { App } from "obsidian";
import { ParsedBookMetadata } from "./types";

// 2. Academic-style fallback metadata parser
export async function fetchAcademicMetadataFallback(
  app: App,
  title: string,
  author: string
): Promise<ParsedBookMetadata> {
  const now = new Date();
  return {
    title: title || "Untitled Article",
    author: [String(author || "Unknown Author")], // ✅ Wrap in array for string[] support
    publisher: "Unknown Journal",
    publishDate: "", // Could be parsed later from text if needed
    ISBN10: "",
    ISBN13: "",
    pages: "",
    category: "Academic",
    url: "",
    doi: "",
    language: "",
    description: "",
    cover: "",
    source: "Manual Academic Fallback",
    date: now.toISOString(),
    highlights: now.toISOString(),
    modified: now.toLocaleString(),
  };
}