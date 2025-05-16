// scanner.ts
// Purpose: Scan, parse, load template, inject highlights, write .md, mark done
// Last updated: 2025-05-16 07:36 PDT

import { normalizePath, Vault } from "obsidian";
import { getTXTFilesInFolder } from "./utils";
import { parseBooxTXTFile } from "./parser";
import { loadTemplate } from "./bookTemplate";
import { generateFormattedHighlights } from "./generateFormattedHighlights";
import { fetchBookMetadataWithFallback } from "./fetchBookMetadataWithFallback";
import { promptForManualMetadata } from "./ui/promptForManualMetadata";
import fs from "fs";
import { unlink, rename } from "fs/promises";

export async function scanForBooxFiles(app: any, settings: any) {
  const vault: Vault = app.vault;
  const watchFolder = normalizePath(settings.watchFolder);
  const outputFolder = normalizePath(settings.outputFolder);
  const txtFiles = await getTXTFilesInFolder(app, watchFolder);

  console.log("[BooxSync][scanner.ts] 🔎 Scanning folder:", watchFolder);

  for (const file of txtFiles) {
    const fullPath = `${app.vault.adapter.basePath}/${file.path}`;

    if (file.basename.endsWith(".done")) {
      console.log("[BooxSync][scanner.ts] ✅ Skipping already processed file:", file.name);
      continue;
    }

    try {
      const parsed = await parseBooxTXTFile(file, vault);
      console.log("[BooxSync][scanner.ts] ✅ Parsed file:", parsed.title);

      const now = new Date();
      let enriched;

      if (settings.enableMetadataFetch) {
        enriched = await fetchBookMetadataWithFallback(app, parsed.title, parsed.author, now.toISOString());
      }

      if (!enriched) {
        console.warn("[BooxSync][scanner.ts] ❌ No metadata returned. Launching manual modal...");
        enriched = await promptForManualMetadata(app, {
          title: parsed.title,
          author: parsed.author,
          date: now.toISOString(),
          source: "Manual",
          highlights: now.toISOString(),
          modified: now.toLocaleString()
        });

        if (!enriched) {
          console.warn("[BooxSync][scanner.ts] ❌ User skipped manual entry. Skipping file:", file.name);
          continue;
        }
      }

      const metadata: Record<string, string> = {
        title: enriched.title,
        author: enriched.author.join(", "),
        category: enriched.category ?? "",
        publisher: enriched.publisher ?? "",
        publishDate: enriched.publishDate ?? "",
        doi: enriched.doi ?? "",
        url: enriched.url ?? "",
        ISBN10: enriched.ISBN10 ?? "",
        ISBN13: enriched.ISBN13 ?? "",
        source: enriched.source ?? "Boox",
        description: enriched.description ?? "",
        date: enriched.date,
        highlights: enriched.highlights ?? now.toISOString(),
		modified: enriched.modified ?? now.toLocaleString(),
      };

      let content = await loadTemplate(app, metadata, settings);

      const highlightSection = settings.highlightSectionTitle?.trim() || "Highlights";
      const insertMarker = `## ${highlightSection}`;

      const formattedHighlights = generateFormattedHighlights(
        parsed.highlights,
        {
          title: enriched.title,
          author: enriched.author,
          date: enriched.date,
          source: enriched.source
        },
        settings
      );

      if (content.includes(insertMarker)) {
        content = content.replace(insertMarker, `${insertMarker}\n\n${formattedHighlights}`);
      } else {
        content += `\n\n## ${highlightSection}\n\n${formattedHighlights}`;
      }

      const sanitizedTitle = enriched.title.replace(/[\\/:*?"<>|]/g, '');
      const outputFileName = `${sanitizedTitle}.md`;
      const outputPath = normalizePath(`${outputFolder}/${outputFileName}`);

      await app.vault.adapter.write(outputPath, content);
      console.log("[BooxSync][scanner.ts] 📝 Wrote MD file to:", outputPath);

      const newFilePath = file.path.replace(/\.txt$/, `.done.txt`);
      const newFullPath = `${app.vault.adapter.basePath}/${newFilePath}`;
      try {
        await rename(fullPath, newFullPath);
        console.log("[BooxSync][scanner.ts] 📁 Renamed processed file to:", newFilePath);
      } catch (err: unknown) {
        console.warn("[BooxSync][scanner.ts] ⚠️ Failed to rename file:", (err as Error).message);
      }

    } catch (err) {
      console.error("[BooxSync][scanner.ts] ❌ Error processing file:", file.name, err);
    }

    if (fs.existsSync(fullPath)) {
      try {
        await unlink(fullPath);
        console.log("[BooxSync][scanner.ts] 🗑️ Deleted original file:", fullPath);
      } catch (err: unknown) {
        console.warn("[BooxSync][scanner.ts] ⚠️ Could not delete file:", fullPath, (err as Error).message);
      }
    } else {
      console.log("[BooxSync][scanner.ts] ⚠️ File already missing or moved:", fullPath);
    }
  }

  console.log("[BooxSync][scanner.ts] ✅ Finished scanning.");
}