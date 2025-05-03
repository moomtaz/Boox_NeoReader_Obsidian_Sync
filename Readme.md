
# Boox Sync – NeoReader to Obsidian Importer

Automatically import highlights and handwritten notes from your Boox device into Obsidian with rich formatting, YAML metadata, and callout annotations.

📚 Supports citation styles (APA, Chicago, MLA)  
🖊️ Detects and formats callouts from your annotations  
📄 Auto-moves highlights and PDFs to matching Obsidian notes  
🧠 Smart deduplication & update logic  
📦 Just share from NeoReader → Obsidian — the plugin does the rest!

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-Moomtaz-yellow.svg?style=for-the-badge&logo=buymeacoffee)](https://www.buymeacoffee.com/Moomtaz)

---

## 🔧 Installation

1. Download the latest release from the [Releases page](https://github.com/moomtaz/Boox_NeoReader_Obsidian_Sync/releases)
2. Extract and place the plugin folder inside:

YourVault/.obsidian/plugins/boox-sync

3. In Obsidian, go to **Settings > Community plugins > Enable Boox Sync**

---

## ✨ Features

### 📤 Automatic Highlight Import
Just share TXT or PDF notes from Boox’s NeoReader to Obsidian. The plugin will:
- Parse the metadata (title, author, etc.)
- Create or update a note with that title
- Insert formatted highlights with callout annotations
- Pull metadata from Google Books or Open Library

### 📄 Smart PDF Matching
If a PDF file (from handwriting or document markups) is shared and its name matches the book title, the plugin automatically moves it to the note's attachment folder.

---

## 📝 Annotation Callouts

Use annotated symbols in your Boox comments to trigger styled callouts in Obsidian.

| Symbol | Callout Style | Example Annotation |
|--------|----------------|--------------------|
| `!`    | `warning`      | `! Critical Point | This needs attention` |
| `@`    | `tip`          | `@ Key Idea | Great for implementation` |
| `?`    | `question`     | `? Clarify this concept` |
| `^`    | `danger`       | `^ Caution | Conflicting claim` |
| `~`    | `abstract`     | `~ Summary | Wrap-up idea` |

### Before (on Boox):

2025-05-02 09:45 | Page No.: 22
Barakah is not about doing more in less time. It’s about aligning with divine principles.

【Annotation】@ Key Principle | Aligns with Islamic ethics

### After (in Obsidian):

```markdown
> [!quote]
> Mohammed Faris. "Barakah is not about doing more in less time. It's about aligning with divine principles." *The Barakah Effect*, p. 22.
> *Added on 5/2/2025, 9:45:00 AM*

> [!tip] Key Principle  
> Aligns with Islamic ethics



⸻

🧾 YAML Metadata

Automatically added at the top of your notes:

---
title: The Barakah Effect
author: Mohammed A. Faris
publisher: [Not found]
publishdate: 2022
pages: 210
ISBN10: 1800110065
ISBN13: 9781800110069
source: Google Books
url: https://books.google.com
date: 2025-05-03T01:10:00Z
tags: 
rating: 
date read: 
status: 
how read: 
highlights: 2025-05-03T01:10:00Z
modified: 5/2/2025, 6:10 PM
type: Religion
purple: 
---

You can customize the YAML section via the plugin settings.

⸻

🧠 Deduplication Logic

Already imported? The plugin skips it.
Updated annotation? The plugin replaces the old one.

⸻

🚀 Roadmap
	•	Custom template editing in-app
	•	Readwise Integration
	•	Readwise Template Configurator
	•	Auto-tagging by genre/category
	•	Thematic auto-linking within genres

⸻

🧑‍💻 Contributing

Coming soon — contributors welcome! For now, submit issues here

⸻

📄 License

MIT © 2025 Muhammad Saadiq
This plugin is not affiliated with Boox or Onyx International.

