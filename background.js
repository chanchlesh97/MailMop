// Background service worker (MV3)
// Implements OAuth sign-in and token management using chrome.identity

chrome.runtime.onInstalled.addListener(() => {
  console.log("MailMop installed");
});

function getAuthTokenInteractive(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(token);
    });
  });
}

function removeCachedAuthToken(token) {
  return new Promise((resolve, reject) => {
    if (!token) return resolve();
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        // non-fatal
        console.warn("removeCachedAuthToken error", chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

// Promisified storage helpers
function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (items) => {
      resolve(items && items[key]);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve, reject) => {
    try {
      const obj = {};
      obj[key] = value;
      chrome.storage.local.set(obj, () => resolve());
    } catch (e) {
      reject(e);
    }
  });
}

function storageRemove(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, () => resolve());
  });
}

async function signIn() {
  // Request interactive token (shows consent if needed)
  const token = await getAuthTokenInteractive(true);
  const obtainedAt = Date.now();
  // Fetch basic profile to get email
  const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile = await resp.json();
  const auth = { token, obtainedAt, email: profile.email };
  await storageSet("auth", auth);
  return auth;
}

async function signOut() {
  // Remove cached token and clear storage
  const auth = await storageGet("auth");
  if (auth && auth.token) {
    await removeCachedAuthToken(auth.token);
  }
  await storageRemove("auth");
}

async function getStoredAuth() {
  return await storageGet("auth");
}

async function getAccessToken({
  interactive = false,
  forceRefresh = false,
} = {}) {
  // Try stored token first
  const stored = await getStoredAuth();
  if (stored && stored.token && !forceRefresh) {
    return stored.token;
  }

  if (stored && stored.token && forceRefresh) {
    // Remove cached token and obtain a fresh one
    await removeCachedAuthToken(stored.token);
  }

  // Try to get a token (may prompt if interactive=true)
  const token = await getAuthTokenInteractive(interactive);
  // Update storage
  const auth = { token, obtainedAt: Date.now() };
  // try to fetch email if missing
  try {
    const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile = await resp.json();
    if (profile && profile.email) auth.email = profile.email;
  } catch (e) {
    // ignore profile errors
  }
  await storageSet("auth", auth);
  return token;
}

// Message API for popup / other parts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SIGN_IN") {
    (async () => {
      try {
        const auth = await signIn();
        sendResponse({ success: true, email: auth.email });
      } catch (e) {
        console.error("Sign-in failed", e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "SIGN_OUT") {
    (async () => {
      try {
        await signOut();
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "GET_SIGNIN_STATUS") {
    (async () => {
      try {
        const auth = await getStoredAuth();
        if (auth && (auth.email || auth.token)) {
          // Consider token presence as signed-in even if email lookup failed
          sendResponse({ signedIn: true, email: auth.email });
        } else {
          sendResponse({ signedIn: false });
        }
      } catch (e) {
        sendResponse({ signedIn: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "GET_ACCESS_TOKEN") {
    (async () => {
      try {
        const token = await getAccessToken({
          interactive: !!msg.interactive,
          forceRefresh: !!msg.forceRefresh,
        });
        sendResponse({ success: true, token });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "SEARCH") {
    (async () => {
      try {
        let token = await getAccessToken({ interactive: false });
        const q = encodeURIComponent(msg.query || "");
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}`;
        let r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.status === 401) {
          // try refresh
          token = await getAccessToken({
            interactive: true,
            forceRefresh: true,
          });
          r = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        const json = await r.json();
        sendResponse(json);
      } catch (e) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "OPEN_UI_FROM_CONTENT") {
    (async () => {
      try {
        const url = chrome.runtime.getURL("popup.html");
        chrome.windows.create({ url, type: "popup", width: 420, height: 600 });
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
});
