// appendToLog.ts — Auto-Creating Structured Daily Log Writer
// Purpose: Writes timestamped logs into a daily markdown log file under the specified folder in the Obsidian vault.
// Last updated: 2025-05-04 17:21 PDT

// 1. Declarations
import { App, TFile, TFolder, normalizePath } from "obsidian";

// 2. Type definitions
export type LogLevel = "INFO" | "WARN" | "ERROR";
export type LogCategory = "PARSE" | "METADATA" | "SYNC" | "IMPORT";

// 3. Returns normalized daily log file path
export function getDatedLogPath(logFolder: string): string {
  const today = new Date().toISOString().split("T")[0];
  return normalizePath(`${logFolder}/boox-log-${today}.md`);
}

// 4. Appends an entry to the log file (creates file and folder if missing)
export async function appendToLog(
  app: App,
  path: string,
  message: string,
  level: LogLevel = "INFO",
  category: LogCategory = "SYNC"
): Promise<void> {
  const entry = `[${new Date().toISOString()}] [${level}] [${category}] ${message}`;
  const folderPath = path.substring(0, path.lastIndexOf("/"));

  // 4.a Ensure folder exists
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder) {
    await app.vault.createFolder(folderPath);
  }

  // 4.b Append or create log file
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) {
    const prev = await app.vault.read(file);
    await app.vault.modify(file, `${prev}\n${entry}`);
  } else {
    await app.vault.create(path, entry);
  }
}