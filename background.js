// Background service worker (MV3)
// Handles authentication and Gmail API proxying for the popup.

chrome.runtime.onInstalled.addListener(() => {
  console.log('MailMop installed');
});

async function getToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({interactive}, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(token);
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SIGN_IN') {
    (async () => {
      try {
        const token = await getToken(true);
        // Basic profile fetch to get the email - optional
        const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {Authorization: `Bearer ${token}`}
        });
        const profile = await resp.json();
        sendResponse({email: profile.email});
      } catch (e) {
        console.error('Sign-in failed', e);
        sendResponse({error: e.message});
      }
    })();
    return true; // keep channel open for async response
  }

  if (msg.type === 'SEARCH') {
    (async () => {
      try {
        const token = await getToken(false);
        const q = encodeURIComponent(msg.query || '');
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}`;
        const r = await fetch(url, {headers: {Authorization: `Bearer ${token}`}});
        const json = await r.json();
        sendResponse(json);
      } catch (e) {
        sendResponse({error: e.message});
      }
    })();
    return true;
  }
});
