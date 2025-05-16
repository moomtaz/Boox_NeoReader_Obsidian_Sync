// validateMetadata.ts – Ensure required fields are present in metadata before writing
// Last updated: 2025-05-04 17:14 PDT

//1. Declarations
import { BookMetadata } from "./BookMetadata";

//2. validateRequiredFields
// Returns an array of missing YAML fields (used before writing or importing)
export function validateRequiredFields(metadata: BookMetadata): string[] {
  const requiredFields = ["title", "author", "date", "source"];
  const missing = requiredFields.filter((field) => !metadata[field]);
  return missing;
}