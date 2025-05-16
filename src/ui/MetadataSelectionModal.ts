// MetadataSelectionModal.ts — Present Google Books search results for user selection
// Purpose: User selects the best match for metadata from a list
// Last updated: 2025-05-16 06:57 PDT

import { App, Modal, Setting, ButtonComponent } from "obsidian";
import { ParsedBookMetadata } from "../types";

export class MetadataSelectionModal extends Modal {
  private options: ParsedBookMetadata[];
  private onSelect: (metadata: ParsedBookMetadata | null, skip: boolean) => void;

  constructor(
    app: App,
    options: ParsedBookMetadata[],
    onSelect: (metadata: ParsedBookMetadata | null, skip: boolean) => void
  ) {
    super(app);
    this.options = options;
    this.onSelect = onSelect;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "📚 Select Correct Metadata" });

    if (this.options.length === 0) {
      contentEl.createEl("p", { text: "No metadata suggestions found." });
    }

    this.options.forEach((meta, index) => {
      const card = contentEl.createDiv({ cls: "booxsync-metadata-card" });

      card.createEl("h4", { text: `${meta.title}` });
      card.createEl("p", { text: `Author(s): ${meta.author?.join(", ")}` });
      if (meta.publisher) card.createEl("p", { text: `Publisher: ${meta.publisher}` });
      if (meta.publishDate) card.createEl("p", { text: `Published: ${meta.publishDate}` });
      if (meta.description) {
        const desc = card.createEl("p", { text: meta.description.slice(0, 240) + "..." });
        desc.style.fontStyle = "italic";
      }

      new ButtonComponent(card)
        .setButtonText("✅ Use this metadata")
        .setCta()
        .onClick(() => {
          meta.source = "Google Books";
          meta.date = new Date().toISOString();
          meta.highlights = new Date().toISOString();
          meta.modified = new Date().toLocaleString();
          this.close();
          this.onSelect(meta, false);
        });
    });

    new Setting(contentEl)
      .setName("Manual Input Instead?")
      .addButton((btn) => {
        btn.setButtonText("✏️ Manual Input");
        btn.onClick(() => {
          this.close();
          this.onSelect(null, false);
        });
      });

    new Setting(contentEl)
      .setName("Skip Metadata Enrichment")
      .addButton((btn) => {
        btn.setButtonText("⏭️ Skip");
        btn.onClick(() => {
          this.close();
          this.onSelect(null, true);
        });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}