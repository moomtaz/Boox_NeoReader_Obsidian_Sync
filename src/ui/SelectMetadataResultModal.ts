// SelectMetadataResultModal.ts — Show multiple Google Books results for selection
// Purpose: Allow user to choose the correct book metadata
// Last updated: 2025-05-16 23:15 PDT

import { App, Modal, Setting } from "obsidian";
import { ParsedBookMetadata } from "../types";

export class SelectMetadataResultModal extends Modal {
  private results: ParsedBookMetadata[];
  private onSelect: (selected: ParsedBookMetadata | null) => void;

  constructor(app: App, results: ParsedBookMetadata[], onSelect: (selected: ParsedBookMetadata | null) => void) {
    super(app);
    this.results = results;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "📚 Choose the correct book" });

    if (this.results.length === 0) {
      contentEl.createEl("p", { text: "No results found." });
      this.onSelect(null);
      this.close();
      return;
    }

    this.results.forEach((book) => {
      const label = `${book.title} by ${book.author?.join(", ") || "Unknown Author"} (${book.publishDate || "n.d."})`;
      const desc = book.description ? book.description.slice(0, 120) + "..." : "No description available.";

      new Setting(contentEl)
        .setName(label)
        .setDesc(desc)
        .addButton((btn) => {
          btn.setButtonText("Select")
            .setCta()
            .onClick(() => {
              this.onSelect(book);
              this.close();
            });
        });
    });

    new Setting(contentEl)
      .setName("Skip")
      .setDesc("Ignore results and continue with manual metadata entry.")
      .addButton((btn) => {
        btn.setButtonText("Skip")
          .onClick(() => {
            this.onSelect(null);
            this.close();
          });
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}