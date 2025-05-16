// updateFrontmatterMetadata.ts — Updates YAML frontmatter with parsed or fetched metadata
// Purpose: Overwrite or insert fields from metadata into a file’s frontmatter block
// Last updated: 2025-05-04 18:34 PDT

// 1. Declarations - import Obsidian API and metadata type
import { App, TFile } from "obsidian";
import { ParsedBookMetadata } from "./types";

// 2. Function to update frontmatter using parsed or fetched metadata
export async function updateFrontmatterMetadata(
  app: App,
  file: TFile,
  metadata: ParsedBookMetadata
): Promise<void> {
  // 2.a Read current file content
  const content = await app.vault.read(file);
  const lines = content.split("\n");

  // 2.b Locate YAML frontmatter block
  const start = lines.findIndex((line) => line.trim() === "---");
  const end = lines.findIndex((line, i) => i > start && line.trim() === "---");

  if (start === -1 || end === -1) {
    console.warn("⚠️ No valid YAML frontmatter found for", file.name);
    return;
  }

  // 2.c Extract keys from the current frontmatter block
  const frontmatterLines = lines.slice(start + 1, end);
  const existingKeys = frontmatterLines.map((line) => line.split(":")[0].trim());

  // 2.d Build updated frontmatter
  const updatedFrontmatter = [...frontmatterLines];

  for (const [key, value] of Object.entries(metadata)) {
    if (!value) continue; // Skip undefined/null/empty

    const formatted = typeof value === "string" ? value : value.toString();
    const index = existingKeys.indexOf(key);

    if (index !== -1) {
      // 🛠️ Replaced existing key with updated value
      updatedFrontmatter[index] = `${key}: ${formatted}`;
    } else {
      // ➕ Appended new key
      updatedFrontmatter.push(`${key}: ${formatted}`);
    }
  }

  // 2.e Reassemble full note with modified frontmatter
  const newContent = [
    ...lines.slice(0, start + 1),
    ...updatedFrontmatter,
    ...lines.slice(end),
  ].join("\n");

  // 2.f Write updated content back to file
  await app.vault.modify(file, newContent);
}