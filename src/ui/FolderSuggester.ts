// FolderSuggester.ts — UI component for fuzzy folder selection
// Purpose: Autocomplete folder paths when configuring plugin settings
// Last updated: 2025-05-07 17:21 PDT (BooxSync v0.1.7)

import { App, TFolder, FuzzySuggestModal } from "obsidian";

/**
 * FolderSuggester - Modal class to allow fuzzy selection of folders.
 * Triggers when the associated input is clicked (not focused).
 */
export class FolderSuggester extends FuzzySuggestModal<TFolder> {
  inputEl: HTMLInputElement;

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app);
    this.inputEl = inputEl;
    this.setPlaceholder("Select a folder");
    this.inputEl.title = "Click to select a folder from your vault"; // ✅ Tooltip hint

    // 🔄 Prevent recursive modal calls on focus
    const openModal = () => this.open();
    this.inputEl.addEventListener("click", openModal);
  }

  getItems(): TFolder[] {
    const folders = this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder) as TFolder[];

    // ✅ Fallback message if no folders are found
    if (folders.length === 0) {
      console.warn("[BooxSync][FolderSuggester] ⚠️ No folders found in vault.");
    }

    return folders;
  }

  getItemText(item: TFolder): string {
    return item.path;
  }

  onChooseItem(item: TFolder): void {
    this.inputEl.value = item.path;
    this.inputEl.dispatchEvent(new Event("input"));
    this.close();
  }
}