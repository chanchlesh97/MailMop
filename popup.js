// Popup script for MailMop
document.addEventListener("DOMContentLoaded", () => {
  const signInBtn = document.getElementById("sign-in");
  const userInfo = document.getElementById("user-info");
  const authSection = document.getElementById("auth-section");
  const searchSection = document.getElementById("search-section");
  const signOutBtn = document.createElement("button");
  signOutBtn.id = "sign-out";
  signOutBtn.textContent = "Sign out";
  signOutBtn.style.display = "none";
  authSection.appendChild(signOutBtn);
  const statusEl = document.createElement("div");
  statusEl.id = "status";
  authSection.appendChild(statusEl);

  async function refreshSignInStatus() {
    const res = await chrome.runtime.sendMessage({ type: "GET_SIGNIN_STATUS" });
    if (res && res.signedIn) {
      userInfo.style.display = "block";
      userInfo.textContent = `Signed in as ${res.email}`;
      authSection.style.display = "none";
      searchSection.style.display = "block";
      signOutBtn.style.display = "inline-block";
    } else {
      userInfo.style.display = "none";
      authSection.style.display = "block";
      searchSection.style.display = "none";
      signOutBtn.style.display = "none";
    }
  }

  refreshSignInStatus();

  signInBtn.addEventListener("click", async () => {
    signInBtn.disabled = true;
    signInBtn.textContent = "Signing in...";
    try {
      const res = await chrome.runtime.sendMessage({ type: "SIGN_IN" });
      if (res && res.success) {
        statusEl.textContent = "Signed in successfully";
        await refreshSignInStatus();
      } else {
        statusEl.textContent = "Sign-in failed: " + (res.error || "unknown");
        signInBtn.disabled = false;
        signInBtn.textContent = "Sign in with Google";
      }
    } catch (err) {
      console.error(err);
      signInBtn.disabled = false;
      signInBtn.textContent = "Sign in with Google";
    }
  });

  signOutBtn.addEventListener("click", async () => {
    signOutBtn.disabled = true;
    statusEl.textContent = "Signing out...";
    const res = await chrome.runtime.sendMessage({ type: "SIGN_OUT" });
    if (res && res.success) {
      statusEl.textContent = "Signed out";
      setTimeout(() => (statusEl.textContent = ""), 1500);
      await refreshSignInStatus();
    } else {
      statusEl.textContent = "Sign out failed";
    }
    signOutBtn.disabled = false;
  });

  const searchBtn = document.getElementById("search");
  searchBtn.addEventListener("click", async () => {
    const query = document.getElementById("query").value;
    const results = document.getElementById("results");
    results.textContent = "Searching...";
    try {
      const resp = await chrome.runtime.sendMessage({ type: "SEARCH", query });
      results.textContent = JSON.stringify(resp || {}, null, 2);
    } catch (e) {
      results.textContent = "Error: " + e.message;
    }
  });
});
