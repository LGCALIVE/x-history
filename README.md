# X Timeline History

A lightweight Chrome extension that automatically records tweets you read on X (Twitter). Never lose a tweet you've seen again.

## Features

- **Auto-record** — Click into any tweet and it's saved automatically
- **Search** — Find saved tweets by author name, handle, or content
- **Compact / Full view** — Toggle between a scannable list and full content view
- **Date grouping** — Tweets grouped by day (Today, Yesterday, etc.) for easy navigation
- **Profile avatars** — Shows author avatars alongside saved tweets
- **Clear cache** — One-click cleanup to free storage
- **Privacy-first** — All data stored locally, zero network requests, no tracking

## How It Works

The extension injects a content script into X/Twitter pages. When you navigate to a tweet detail page (`x.com/user/status/123`), it extracts the main tweet's content from the DOM and saves it to `chrome.storage.local`. No API calls, no background servers, no data leaves your browser.

## Install

### From source (Developer Mode)

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. Browse X as usual — tweets you click into are recorded automatically

## Usage

1. Browse X normally
2. Click into tweets you want to remember
3. Click the extension icon to view your reading history
4. Use the search bar to find specific tweets
5. Click any saved tweet to open the original

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save tweets locally |
| `unlimitedStorage` | Support up to 10,000 saved tweets |
| Content script on `x.com` / `twitter.com` | Read tweet content from the page |

No `tabs`, `webRequest`, or other sensitive permissions required.

## Storage

- Each tweet: ~1 KB (text only, images are loaded via URL on demand)
- 10,000 tweets: ~10 MB
- Data never leaves your browser

## Tech Stack

- Vanilla JavaScript (ES2020+)
- Vanilla CSS
- Chrome Extension Manifest V3
- `chrome.storage.local`
- Zero external dependencies

## Project Structure

```
x-timeline-history/
├── manifest.json     # Extension config (MV3)
├── content.js        # DOM scraper, runs on x.com
├── popup.html        # Popup markup
├── popup.js          # Popup logic (search, render, view toggle)
├── popup.css         # Popup styles (light theme)
└── icons/            # Extension icons (16/48/128px)
```

## License

[MIT](LICENSE)
