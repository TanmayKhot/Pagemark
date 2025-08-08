# PageMark - Web Extension

A Chrome browser extension that saves and returns to specific scroll positions on any webpage.

## What it can be used for

- **Long Articles** - Save interesting sections while reading
- **Documentation** - Mark specific sections for quick reference
- **Research** - Keep track of important findings across multiple pages
- **Shopping** - Remember product positions on e-commerce sites
- **Social Media** - Save interesting posts or comments
- **Learning** - Mark important points in educational content

## How to install it

### Requirements
- Google Chrome browser

### Installation Steps
1. **Download the Extension**
   ```bash
   git clone https://github.com/TanmayKhot/Pagemark.git
   cd Pagemark
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right corner)
   - Click "Load unpacked"
   - Select the Pagemark folder containing `manifest.json`

3. **Pin the Extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "PageMark" in the list
   - Click the pin icon to keep it visible

## How to use it

### Save a Position
- **Method 1**: Click the floating button (bottom-right corner)
- **Method 2**: Use keyboard shortcut `Ctrl+Shift+M`
- Enter a name for the position when prompted
- A small blue marker will appear on the scrollbar

### Return to a Position
- **Method 1**: Click any marker on the scrollbar
- **Method 2**: Use the popup interface:
  - Click the PageMark icon in toolbar
  - Click "Show Markers"
  - Click "Go" next to any saved position

### Visual Markers
- **Blue markers** = Manually saved positions
- **Yellow marker** = Auto-saved last position
- **Hover tooltips** show marker names
- **Click markers** to jump to positions

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Save current position |
| `Ctrl+Shift+L` | Show/hide markers panel |

## How it works

### Architecture
- **Manifest V3** - Modern Chrome extension architecture
- **Content Scripts** - Runs on every webpage
- **Background Service Worker** - Handles storage and lifecycle
- **Popup Interface** - User-friendly management interface

### Data Storage
- **Local Storage** - All data stored locally in your browser
- **URL-based Organization** - Markers organized by webpage
- **No Cloud Sync** - Your data stays private
- **Chrome Storage API** - Reliable local storage using Chrome's built-in storage system

### Project Structure
```
Pagemark/
├── manifest.json          # Extension configuration
├── content.js            # Content script (runs on webpages)
├── content.css           # Styles for content script UI
├── popup.html            # Popup interface
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── background.js         # Background service worker
└── icons/                # Extension icons
```

### Upcoming features

- **Chat Interfaces** - Save positions in long conversations (ChatGPT, Gemini, etc.)
- **Persistent memory** - Save positions on webpages even if a webpage is closed and reopened




