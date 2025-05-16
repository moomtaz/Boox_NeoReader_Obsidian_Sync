// BookMetadata.ts – Interface for raw fetched book data (Google Books or Scholar)
// Last updated: 2025-05-04 17:11 PDT

//1. Declarations
export interface BookMetadata {
  title: string;
  author: string;
  publisher?: string;
  publishDate?: string;
  ISBN10?: string;
  ISBN13?: string;
  pages?: number;
  cover?: string;
  category?: string;
  description?: string;
  url?: string;
  doi?: string;
  language?: string;

  //2. Extension - to allow additional unknown keys if needed
  [key: string]: any;
}