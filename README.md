# MailMop (MVP skeleton)

This repository is a minimal Chrome Manifest V3 extension skeleton for MailMop — a client-side-only Gmail bulk-clean tool.

Quick start

1. In the `manifest.json` replace `oauth2.client_id` with your OAuth client ID from Google Cloud Console.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable Developer mode and click "Load unpacked". Choose this repository's folder.

Files
- `manifest.json` — Manifest V3 config (permissions & oauth2 placeholder).
- `popup.html` / `popup.js` — Basic popup UI and wiring.
- `background.js` — MV3 service worker stub handling chrome.identity.
- `options.html` / `options.js` — Basic options page.
- `styles.css` — Minimal styling.

Next steps
- Implement full OAuth flow and token management.
- Implement Gmail REST client (`gmailClient.js`) and message operations.
- Add dry-run, undo window, presets UI, and quota/backoff handling.
# MailMop
