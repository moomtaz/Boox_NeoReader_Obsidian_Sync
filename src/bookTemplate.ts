// bookTemplate.ts — Loads and injects a Markdown template with enriched metadata
// Last updated: 2025-05-08 19:20 PDT

// 1. Imports
import { App, normalizePath, TFile } from "obsidian";
import { BooxSyncSettings } from "./settings";
import { ensureFolderExists, resolveFolderPath } from "./utils";

// 2. Fallback default template
const DEFAULT_TEMPLATE = `---
title: {{title}}
author: {{author}}
category: {{category}}
publisher: {{publisher}}
publishdate: {{publishDate}}
doi: {{doi}}
url: {{url}}
ISBN10: {{ISBN10}}
ISBN13: {{ISBN13}}
source: {{source}}
date: {{date}}
highlights: {{highlights}}
modified: {{modified}}
---

[[Favorite Books]] | [[To Read List]]

## Summary

> [!abstract] Summary  
 {{description}}

## Thesis

> [!question] What are the main points of the book?  
> What was the author trying to say?

## Antithesis

> [!question] What are some points you took issue with?  
> What did the author miss?

## {{highlightSectionTitle}}


`;

// 3. Ensure default template file exists
export async function ensureDefaultTemplateExists(
  app: App,
  outputFolder: string,
  settings: BooxSyncSettings
): Promise<void> {
  const fullPath = normalizePath(`${outputFolder}/default-template.md`);
  const exists = app.vault.getAbstractFileByPath(fullPath);

  if (!exists) {
    await ensureFolderExists(app, outputFolder);
    const section = settings.highlightSectionTitle?.trim() || "Highlights";
    const filled = DEFAULT_TEMPLATE.replace(/{{highlightSectionTitle}}/g, section);
    await app.vault.create(fullPath, filled);
    console.log("[BooxSync][bookTemplate.ts] ✅ Created default template at:", fullPath);
  }
}

// 4. Load and fill template with metadata
export async function loadTemplate(
  app: App,
  metadata: Record<string, string>,
  settings: BooxSyncSettings
): Promise<string> {
  try {
    const folderPath = await resolveFolderPath(app, settings.templateFolder);
    const filePath = normalizePath(`${folderPath}/default-template.md`);
    const file = app.vault.getAbstractFileByPath(filePath);

    let template = file && file instanceof TFile
      ? await app.vault.read(file)
      : DEFAULT_TEMPLATE;

    if (!file) {
      console.warn("[BooxSync][bookTemplate.ts] ⚠️ No template file found, using fallback.");
    }

    // Replace all placeholders
    for (const [key, value] of Object.entries(metadata)) {
      template = template.replaceAll(`{{${key}}}`, value || "");
    }

    // Ensure highlight section title placeholder is replaced
    const highlightSection = settings.highlightSectionTitle?.trim() || "Highlights";
    template = template.replace(/{{highlightSectionTitle}}/g, highlightSection);

    // Clean up unused placeholders
    template = template.replace(/{{[^}]+}}/g, "");

    return template;
  } catch (err) {
    console.error("[BooxSync][bookTemplate.ts] ❌ Error loading template:", err);
    return DEFAULT_TEMPLATE.replace(/{{highlightSectionTitle}}/g, "Highlights");
  }
}