//highlightParser.ts
export function parseHighlightBlock(block: string): any {
  return {
    text: block,
    timestamp: new Date().toISOString(), // placeholder
  };
}