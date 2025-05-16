// logging.ts — Auto-creating log writer for plugin events
// Purpose: Structured log handler that creates a dated markdown log per day with auto-folder support
// Called by: fetchBookMetadataWithFallback.ts, parser.ts, and others
// Last updated: 2025-05-04 17:26 PDT (Bay Area local time)

// 1. Declarations
import { App, normalizePath, TFile } from "obsidian";

// 2. Constants
const LOG_FILENAME = "boox-update.log";

// 3. appendToLog - Logs plugin events by writing a line into a daily log file.
//    If the file or its folder does not exist, they are automatically created.
export async function appendToLog(
  app: App,
  logFolderPath: string,
  message: string,
  level: "INFO" | "ERROR" | "DEBUG",
  category: string
): Promise<void> {
  const now = new Date();
  const isoDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timestamp = now.toLocaleString(); // Human-readable
  const filePath = normalizePath(`${logFolderPath}/${isoDate} - ${LOG_FILENAME}`);
  const logLine = `[${timestamp}] [${level}] [${category}] ${message}\n`;

  // 3.a Ensure log file exists or create it
  let file = app.vault.getAbstractFileByPath(filePath) as TFile;

  if (!file) {
    try {
      await app.vault.create(filePath, logLine);
    } catch (e) {
      // 3.b If folder doesn't exist, create it, then retry file creation
      const folderOnly = filePath.substring(0, filePath.lastIndexOf("/"));
      const folder = app.vault.getAbstractFileByPath(folderOnly);
      if (!folder) {
        await app.vault.createFolder(folderOnly);
      }
      await app.vault.create(filePath, logLine); // retry
    }
  } else {
    await app.vault.append(file, logLine);
  }
}