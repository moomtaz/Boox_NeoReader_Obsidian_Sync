// bookTemplate.ts
import { App, normalizePath } from "obsidian";
import { BooxSyncSettings } from "./settings";

function generateDefaultTemplate(settings: BooxSyncSettings): string {
  return [
    "---",
    ...settings.includedYamlFields.map(key => `${key}:`),
    "---",
    "",
    "[[Favorite Books]] | [[To Read List]]",
    "",
    "## Summary",
    "",
    "> [!abstract] Summary",
    "> {description}",
    "",
    "## Thesis",
    "",
    "> [!question] Main Points",
    "> What was the author trying to say?",
    "",
    "## Antithesis",
    "",
    "> [!question] Disagreements",
    "> Points you took issue with.",
    "",
    "## Synthesis",
    "",
    "> [!question] Middle Ground",
    "> How would you reconcile opposing ideas?",
    "",
    "## Related",
    "",
    "> [!note] Related Topics",
    "",
    `## ${settings.highlightSectionTitle}`,
    ""
  ].join("\n");
}

export async function ensureDefaultTemplateExists(app: App, path: string, settings: BooxSyncSettings): Promise<void> {
  const exists = app.vault.getAbstractFileByPath(normalizePath(path));
  if (!exists) {
    const template = generateDefaultTemplate(settings);
    await app.vault.create(normalizePath(path), template);
  }
}

export async function loadTemplate(app: App, metadata: Record<string, string>, settings: BooxSyncSettings): Promise<string> {
  const yamlLines = [`---`];

  for (const key of settings.includedYamlFields) {
    const safeValue = metadata[key] ?? "";
    yamlLines.push(`${key}: ${safeValue}`);
  }

  yamlLines.push(`---`);

  return [
    yamlLines.join("\n"),
    "",
    "[[Favorite Books]] | [[To Read List]]",
    "",
    "## Summary",
    "",
    "> [!abstract] Summary",
    `> ${metadata.description || "Contents"}`,
    "",
    "## Thesis",
    "",
    "> [!question] Main Points",
    "> What was the author trying to say?",
    "",
    "## Antithesis",
    "",
    "> [!question] Disagreements",
    "> Points you took issue with.",
    "",
    "## Synthesis",
    "",
    "> [!question] Middle Ground",
    "> How would you reconcile opposing ideas?",
    "",
    "## Related",
    "",
    "> [!note] Related Topics",
    "",
    `## ${settings.highlightSectionTitle}`,
    ""
  ].join("\n");
}
