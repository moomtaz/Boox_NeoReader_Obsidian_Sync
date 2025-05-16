// types.ts
// Purpose: Define structured Boox highlight and metadata types
// Last updated: 2025-05-16 20:55 PDT

// 🔹 Highlight: Represents a user-highlighted passage and optional annotation
export interface Highlight {
  text: string;
  annotation?: string;
  label?: string;    // e.g., "!", "@", "^"
  page?: string;
  timestamp?: string;
}

// 🔹 ParsedBookMetadata: Unified metadata schema from filename, manual input, or Google Books
export interface ParsedBookMetadata {
  // Core Metadata Fields
  title: string;
  author: string[];
  date: string;

  // Optional Standard Metadata
  publisher?: string;
  publishDate?: string;
  publishedDate?: string;
  ISBN10?: string;
  ISBN13?: string;
  pages?: string;
  cover?: string;
  category?: string;
  categories?: string[];
  description?: string;
  url?: string;
  infoLink?: string;
  language?: string;
  doi?: string;

  // Plugin-specific Metadata
  source: string;            // e.g. "Google Books", "Manual", "Filename Inferred"
  highlights?: string;       // Timestamp of last highlight update
  modified?: string;         // Last modified (displayed as local string)
  industryIdentifiers?: { type: string; identifier: string }[];
}

// 🔹 ParsedBooxFile: Returned after parsing a Boox TXT file
export interface ParsedBooxFile {
  title: string;
  author: string[];
  highlights: Highlight[];
}