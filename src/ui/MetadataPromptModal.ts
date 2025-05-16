// MetadataPromptModal.ts — Manual fallback metadata input UI
// Purpose: Allows user to input title and multiple authors if enrichment fails
// Last updated: 2025-05-07 17:48 PDT

// 1. Imports
import { App, Modal, Setting, ButtonComponent } from "obsidian";
import { ParsedBookMetadata } from "../types";

// 2. Modal Class Definition
export class MetadataPromptModal extends Modal {
  private onSubmit: (metadata: ParsedBookMetadata | null, skip: boolean) => void;
  private defaultMetadata: ParsedBookMetadata;

  constructor(
    app: App,
    initial: ParsedBookMetadata,
    onSubmit: (metadata: ParsedBookMetadata | null, skip: boolean) => void
  ) {
    super(app);
    this.defaultMetadata = initial;
    this.onSubmit = onSubmit;
  }

  // 2.a UI Construction
  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "📚 Enter Book Metadata" });

    // Title Input
    new Setting(contentEl)
      .setName("Title")
      .addText((text) =>
        text
          .setPlaceholder("e.g. Flow")
          .setValue(this.defaultMetadata.title)
          .onChange((value) => (this.defaultMetadata.title = value.trim()))
      );

    // Author Input (semicolon-separated)
    new Setting(contentEl)
      .setName("Author(s)")
      .setDesc("Separate authors with semicolons (;) to preserve commas in names.")
      .addText((text) =>
        text
          .setPlaceholder("Irene A. Stafford, M.D.; Kimberly A. Workowski, M.D.")
          .setValue(this.defaultMetadata.author?.join("; ") || "")
          .onChange((value) => {
            this.defaultMetadata.author = value
              .split(";")
              .map((name) => name.trim())
              .filter((name) => name.length > 0);
          })
      );

    // Buttons
    const buttonRow = contentEl.createDiv({ cls: "booxsync-modal-buttons" });

    new ButtonComponent(buttonRow)
      .setButtonText("Submit")
      .setCta()
      .onClick(() => {
        if (!this.defaultMetadata.title.trim()) {
          new Setting(contentEl).setDesc("⚠️ Title cannot be empty.");
          return;
        }

        this.defaultMetadata.source = "Manual";
        this.defaultMetadata.date = new Date().toISOString();
        this.defaultMetadata.highlights = new Date().toISOString();
        this.defaultMetadata.modified = new Date().toLocaleString();

        this.close();
        this.onSubmit(this.defaultMetadata, false);
      });

    new ButtonComponent(buttonRow)
      .setButtonText("Skip Enrichment")
      .onClick(() => {
        this.close();
        this.onSubmit(null, true);
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}