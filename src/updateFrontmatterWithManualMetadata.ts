// updateFrontmatterWithManualMetadata.ts — Manual metadata injection into note frontmatter
// Purpose: Used when a user provides or confirms metadata manually (via modal or fallback)
// Last updated: 2025-05-04 17:50 PDT

// 1. Declarations - import dependencies
import { App, TFile } from "obsidian";
import { ParsedBookMetadata } from "./types";
import { updateFrontmatterMetadata } from "./updateFrontmatterMetadata";

// 2. Function: Accepts user-supplied metadata and updates frontmatter
// 2.a updateFrontmatterWithManualMetadata - used in modal/manual DOI fallback
export async function updateFrontmatterWithManualMetadata(
  app: App,
  file: TFile,
  metadata: ParsedBookMetadata
): Promise<void> {
  await updateFrontmatterMetadata(app, file, metadata);
}