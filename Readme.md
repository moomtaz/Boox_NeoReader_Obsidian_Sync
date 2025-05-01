# Boox NeoReader Obsidian Sync

This Obsidian plugin automatically imports Boox NeoReader highlights and annotations (from `.txt` files) into your vault, formats them using your chosen citation style, and enhances them with metadata from Google Books.

## ✨ Features

- ✅ Auto-watch a Boox sync folder for new highlight `.txt` files
- ✅ Parses and deduplicates highlights
- ✅ Formats with MLA, APA, or Chicago citations
- ✅ Annotate with Obsidian callouts based on prefix
- ✅ Auto-fetch book metadata (ISBN, publisher, description, etc.)
- ✅ Customizable output folders
- ✅ Optional support for handwritten PDF import
- ✅ Google Books integration
- ✅ Automatic file renaming and template filling

## 🔧 Installation

1. Clone or download this repository.
2. Copy the folder into your Obsidian plugins directory:~/.obsidian/plugins/
3. Enable the plugin in Obsidian’s settings.

## ⚙️ Settings

- **Boox Watch Folder**: Folder to monitor for `.txt` highlight files.
- **Output Folder**: Where initial markdown book files are created.
- **Final Folder**: Where finished notes are moved.
- **Citation Style**: MLA, APA, or Chicago.
- **Note Naming**: `Title - Author` or `Title Only`.
- **PDF Import**: Optionally import handwritten PDFs from Boox.
- **Online Metadata**: Use Google Books to enhance notes.
- **Scan Interval**: How often to poll the Boox folder (in seconds).

## 📝 Highlight Format Example

Book Title 2025-04-30 14:20 | Page No.: 25 This is a highlighted quote. 【Annotation】! Key insight about the quote

### Example:

> [!quote]
> Paulo Coelho. "When you want something, all the universe conspires in helping you to achieve it." *The Alchemist*, p. 12.
> *Added on 5/1/2025, 7:05:00 PM*

> [!warning] You need to take note!
> Powerful and motivating idea


Prefixes map to Obsidian callouts:
- `!` = warning
- `@` = tip
- `^` = danger
- `?` = question
- `/` = success
- `"` = quote
- `xx` = example

## 📚 Metadata

The plugin uses Google Books to populate metadata like:
- Title, author
- Publisher, date
- ISBN, page count
- Summary/description
- Book type (e.g., Fiction, Non-fiction)

## 💡 Credits

Built with ❤️ by Muhammad Saadiq for enhanced knowledge workflows.

[👉 **Buy Me a Coffee**](https://buymeacoffee.com/moomtaz?new=1)