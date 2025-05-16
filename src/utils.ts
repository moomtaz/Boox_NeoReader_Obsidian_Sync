// utils.ts — Utility functions for BooxSync Plugin
// Purpose: Resolve folder paths fuzzily, ensure folders exist, validate file types
// Last updated: 2025-05-05 19:27 PDT (v0.1.7)

import { App, normalizePath, TAbstractFile, TFolder, TFile } from "obsidian";

// 1. Resolve or create folder path (case-insensitive)
export async function resolveOrCreateFolder(app: App, inputPath: string): Promise<TFolder> {
  const path = normalizePath(inputPath.trim());
  const file = app.vault.getAbstractFileByPath(path);

  if (file instanceof TFolder) return file;

  if (!file) {
    await app.vault.createFolder(path);
    const created = app.vault.getAbstractFileByPath(path);
    if (created instanceof TFolder) return created;
  }

  throw new Error(`❌ Path "${path}" exists but is not a folder.`);
}

// 2. Get all .txt files in a folder
export function getTXTFilesInFolder(app: App, folderPath: string): TFile[] {
  const normalized = normalizePath(folderPath.trim());
  return app.vault.getFiles().filter(
    (f) => f.extension === "txt" && normalizePath(f.path).startsWith(normalized)
  );
}

// 3. Get .pdf files with same base name as a given set
export function getMatchingPDFs(app: App, folderPath: string, basenames: Set<string>): TFile[] {
  const normalized = normalizePath(folderPath.trim());
  return app.vault.getFiles().filter(
    (f) =>
      f.extension === "pdf" &&
      normalizePath(f.path).startsWith(normalized) &&
      basenames.has(f.basename)
  );
}

// 4. Get files by extension (for other future types)
export function getFilesByExtension(app: App, folderPath: string, extension: string): TFile[] {
  const normalized = normalizePath(folderPath.trim());
  return app.vault.getFiles().filter(
    (f) => f.extension === extension && normalizePath(f.path).startsWith(normalized)
  );
}

// 5. Resolve a folder path and return its actual path (not object)
export async function resolveFolderPath(app: App, path: string): Promise<string> {
  const folder = await resolveOrCreateFolder(app, path);
  return folder.path;
}

// 6. Ensure a folder exists, creating it if needed
export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
  await resolveOrCreateFolder(app, folderPath);
}