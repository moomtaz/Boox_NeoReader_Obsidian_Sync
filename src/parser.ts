// parser.ts
// Purpose: Extract metadata and structured highlights from a Boox TXT file
// Last updated: 2025-05-16 22:00 PDT

import { TFile } from "obsidian";
import { ParsedBooxFile, Highlight } from "./types";

export async function parseBooxTXTFile(file: TFile, vault: any): Promise<ParsedBooxFile> {
  console.log("[BooxSync][parser.ts] 🔍 Parsing file:", file.path);

  const content = await vault.read(file);
  const lines: string[] = content
  .split(/\r?\n/)
 .map((line: string) => line.trim())  // ⬅️ This is the line you want to edit
  .filter(Boolean);
  if (lines.length === 0) throw new Error("File is empty or unreadable.");

  const firstLine: string = lines[0].replace(/\u00A0/g, ' ').trim();
  let title = "Unknown Title";
  let author: string[] = ["Unknown"];
  const match = firstLine.match(/<<(.+?)>>\s*(.+)/);

  if (match) {
    title = match[1].trim();
    author = [match[2].trim()];
  } else {
    console.warn("[BooxSync][parser.ts] ⚠️ Metadata not parsed — falling back to filename.");
    title = file.basename.replace(/\.txt$/, "");
  }

  const body = lines.slice(1).join("\n");
  const highlightBlocks = body.split(/---+/).map(block => block.trim()).filter(Boolean);
  const highlights: Highlight[] = [];

  for (const block of highlightBlocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const timestampLine = lines[0];
    const timestampMatch = timestampLine.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s+\|\s+Page No\.: (\d+)/);
    const timestamp = timestampMatch?.[1];
    const page = timestampMatch?.[2];

    if (!timestamp || !page) continue;

    const textLine = lines.find(l => !l.startsWith("【Annotation】") && l !== timestampLine);
    if (!textLine) continue;

    const annotationLine = lines.find(l => l.startsWith("【Annotation】")) || "";
    let label: string | undefined;
    let annotation: string | undefined;

    const annotationMatch = annotationLine.match(/【Annotation】([!@?^~%*]?)\s*(.+)?/);
    if (annotationMatch) {
      label = annotationMatch[1] || undefined;
      annotation = annotationMatch[2]?.trim() || undefined;
    }

    highlights.push({ text: textLine, annotation, label, page, timestamp });
  }

  return { title, author, highlights };
}