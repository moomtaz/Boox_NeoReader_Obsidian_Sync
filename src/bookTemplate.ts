// bookTemplate.ts
import { App, TFile, normalizePath } from "obsidian";

export async function loadTemplate(app: App, metadata: Record<string, string>): Promise<string> {
  const fm = `---
` +
    `title: ${metadata.title}
` +
    `author: ${metadata.author}
` +
    `publisher: ${metadata.publisher}
` +
    `publishdate: ${metadata.publishDate}
` +
    `pages: ${metadata.totalPage}
` +
    `ISBN10: ${metadata.ISBN10}
` +
    `ISBN13: ${metadata.ISBN13}
` +
    `source: ${metadata.source}
` +
    `url: ${metadata.url}
` +
    `date: ${metadata.date}
` +
    `tags: []
` +
    `rating:
` +
    `date read:
` +
    `status:
` +
    `how read:
` +
    `highlights: ${metadata.highlights || ""}
` +
    `modified: ${new Date().toLocaleString("en-US")}
` +
    `type: ${metadata.type || ""}
` +
    `---`;

  const body = `

[[Favorite Books]] | [[To Read List]]

## Summary

> [!abstract] Summary  
${metadata.description || "No summary available."}

## Thesis

> [!question] Main Points  
> What was the author trying to say?

## Antithesis

> [!question] Disagreements  
> Points you took issue with.

## Synthesis

> [!question] Middle Ground  
> How would you reconcile opposing ideas?

## Related

> [!note] Related Topics

## Highlights

`;

  return fm + body;
}

export async function ensureDefaultTemplateExists(app: App): Promise<void> {
  const templatePath = normalizePath("Templates/BookTemplate.md");
  const existing = app.vault.getAbstractFileByPath(templatePath);
  if (!existing) {
    const content = await loadTemplate(app, {
      title: "{ title }",
      author: "{ author }",
      publisher: "{ publisher }",
      publishDate: "{ publishDate }",
      totalPage: "{ totalPage }",
      ISBN10: "{ ISBN10 }",
      ISBN13: "{ ISBN13 }",
      source: "{ source }",
      url: "{ url }",
      date: "{ date }",
      type: "{ type }",
      highlights: "{ highlights }",
      description: "{ description }"
    });
    await app.vault.create(templatePath, content);
  }
}
