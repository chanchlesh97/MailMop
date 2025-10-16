// gmailClient.js
// Lightweight Gmail REST wrapper for extension background or UI code.

const GmailClient = (() => {
  const API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

  async function getToken(interactive = false, forceRefresh = false) {
    const res = await chrome.runtime.sendMessage({
      type: "GET_ACCESS_TOKEN",
      interactive,
      forceRefresh,
    });
    if (res && res.success && res.token) return res.token;
    throw new Error(
      res && res.error ? res.error : "Failed to obtain access token"
    );
  }

  async function requestWithBackoff(url, opts = {}, attempts = 4) {
    let delay = 500;
    for (let i = 0; i < attempts; i++) {
      const r = await fetch(url, opts);
      if (r.status >= 200 && r.status < 300) return r.json();
      if (r.status === 401 && !opts._triedRefresh) {
        // try refresh
        const token = await getToken(true, true);
        opts.headers = { ...opts.headers, Authorization: `Bearer ${token}` };
        opts._triedRefresh = true;
        continue;
      }
      if (r.status === 429 || r.status >= 500) {
        // backoff and retry
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
        continue;
      }
      // other error
      const txt = await r.text();
      throw new Error(`Request failed ${r.status}: ${txt}`);
    }
    throw new Error("Exceeded retries");
  }

  async function listMessages({ q = "", maxResults = 100, pageToken } = {}) {
    const token = await getToken(false, false);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (maxResults) params.set("maxResults", String(maxResults));
    if (pageToken) params.set("pageToken", pageToken);
    const url = `${API_BASE}/messages?${params.toString()}`;
    return requestWithBackoff(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function getMessage(id, format = "metadata", metadataHeaders = []) {
    const token = await getToken(false, false);
    const params = new URLSearchParams();
    if (format) params.set("format", format);
    if (Array.isArray(metadataHeaders) && metadataHeaders.length) {
      metadataHeaders.forEach((h) => params.append("metadataHeaders", h));
    }
    const url = `${API_BASE}/messages/${encodeURIComponent(
      id
    )}?${params.toString()}`;
    return requestWithBackoff(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function batchDelete(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return { result: "no-ids" };
    const token = await getToken(false, false);
    const url = `${API_BASE}/messages/batchDelete`;
    const body = JSON.stringify({ ids });
    return requestWithBackoff(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });
  }

  async function listLabels() {
    const token = await getToken(false, false);
    const url = `${API_BASE}/labels`;
    return requestWithBackoff(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return { listMessages, getMessage, batchDelete, listLabels };
})();

// Expose for browser global usage
if (typeof window !== "undefined") {
  window.GmailClient = GmailClient;
}

// Expose for other modules (CommonJS)
if (typeof module !== "undefined" && module.exports) {
  module.exports = GmailClient;
}
