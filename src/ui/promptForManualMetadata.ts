// promptForManualMetadata.ts — Promise wrapper for MetadataPromptModal
// Purpose: Pause scanner.ts execution and allow manual metadata input
// Last updated: 2025-05-16 23:59 PDT

import { App } from "obsidian";
import { ParsedBookMetadata } from "../types";
import { MetadataPromptModal } from "./MetadataPromptModal";

export function promptForManualMetadata(
  app: App,
  initial: ParsedBookMetadata
): Promise<ParsedBookMetadata | undefined> {
  return new Promise((resolve) => {
    const modal = new MetadataPromptModal(app, initial, (result, skip) => {
      if (skip) {
        resolve(undefined);
      } else {
       resolve(result ?? undefined);
      }
    });
    modal.open();
  });
}