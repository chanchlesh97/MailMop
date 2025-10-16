// Popup script for MailMop
document.addEventListener("DOMContentLoaded", () => {
  const signInBtn = document.getElementById("sign-in");
  const signOutBtn = document.getElementById("sign-out");
  const userInfo = document.getElementById("user-info");
  const authSection = document.getElementById("auth-section");
  const searchSection = document.getElementById("search-section");
  const statusEl = document.getElementById("status");
  const inputFrom = document.getElementById("from");
  const inputOlder = document.getElementById("older");
  const inputCategory = document.getElementById("category");
  const searchBtn = document.getElementById("search");
  const resultsEl = document.getElementById("results");
  const selectAllBtn = document.getElementById("select-all");
  const deleteBtn = document.getElementById("delete-selected");

  let currentResults = [];
  let nextPageToken = null;

  async function refreshSignInStatus() {
    console.log("refreshSignInStatus: locating elements");
    const res = await chrome.runtime.sendMessage({ type: "GET_SIGNIN_STATUS" });
    console.log("refreshSignInStatus: response", res);
    if (res && res.signedIn) {
      userInfo.classList.remove("hidden");
      userInfo.textContent = `Signed in as ${res.email}`;
      authSection.classList.add("hidden");
      searchSection.classList.remove("hidden");
      signOutBtn.classList.remove("hidden");
      console.log(
        "refreshSignInStatus: search-section visible?",
        !searchSection.classList.contains("hidden")
      );
    } else {
      userInfo.classList.add("hidden");
      authSection.classList.remove("hidden");
      searchSection.classList.add("hidden");
      signOutBtn.classList.add("hidden");
      console.log(
        "refreshSignInStatus: search-section visible?",
        !searchSection.classList.contains("hidden")
      );
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

  function buildQuery() {
    const parts = [];
    const from = inputFrom.value.trim();
    if (from) parts.push(`from:${from}`);
    const older = inputOlder.value;
    if (older) parts.push(`older_than:${older}`);
    const cat = inputCategory.value;
    if (cat) parts.push(`category:${cat}`);
    return parts.join(" ");
  }

  function renderResults(list) {
    currentResults = list || {};
    resultsEl.innerHTML = "";
    if (!currentResults.messages || currentResults.messages.length === 0) {
      resultsEl.textContent = "No results";
      selectAllBtn.disabled = true;
      deleteBtn.disabled = true;
      return;
    }
    selectAllBtn.disabled = false;
    deleteBtn.disabled = false;
    const ul = document.createElement("ul");
    ul.className = "results-list";
    currentResults.messages.forEach((m) => {
      const li = document.createElement("li");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "msg-checkbox";
      cb.dataset.id = m.id;
      li.appendChild(cb);

      const content = document.createElement("div");
      content.className = "msg-content";

      const title = document.createElement("div");
      title.className = "msg-title";
      title.textContent = (m._meta && m._meta.subject) || "(no subject)";

      const meta = document.createElement("div");
      meta.className = "msg-meta";
      meta.textContent =
        (m._meta && m._meta.from ? m._meta.from + " · " : "") +
        (m._meta && m._meta.date ? m._meta.date : "");

      const snippet = document.createElement("div");
      snippet.className = "msg-snippet";
      snippet.textContent = (m._meta && m._meta.snippet) || "";

      content.appendChild(title);
      content.appendChild(meta);
      content.appendChild(snippet);
      li.appendChild(content);

      ul.appendChild(li);
    });
    resultsEl.appendChild(ul);
  }
  // pagination
  if (currentResults.nextPageToken) {
    nextPageToken = currentResults.nextPageToken;
    const moreBtn = document.createElement("button");
    moreBtn.textContent = "Load more";
    moreBtn.className = "secondary";
    moreBtn.addEventListener("click", async () => {
      moreBtn.disabled = true;
      statusEl.textContent = "Loading more...";
      try {
        const resp = await window.GmailClient.listMessages({
          q: buildQuery(),
          maxResults: 50,
          pageToken: nextPageToken,
        });
        await enrichMessages(resp);
        // append
        currentResults.messages = currentResults.messages.concat(
          resp.messages || []
        );
        currentResults.nextPageToken = resp.nextPageToken;
        renderResults(currentResults);
      } catch (e) {
        statusEl.textContent = "Error loading more: " + e.message;
      }
      moreBtn.disabled = false;
      statusEl.textContent = "";
    });
    resultsEl.appendChild(moreBtn);
  } else {
    nextPageToken = null;
  }

  selectAllBtn.addEventListener("click", () => {
    const boxes = resultsEl.querySelectorAll(".msg-checkbox");
    boxes.forEach((b) => (b.checked = true));
  });

  deleteBtn.addEventListener("click", async () => {
    const boxes = Array.from(resultsEl.querySelectorAll(".msg-checkbox"));
    const ids = boxes.filter((b) => b.checked).map((b) => b.dataset.id);
    if (ids.length === 0) return alert("No messages selected");
    deleteBtn.disabled = true;
    statusEl.textContent = "Deleting...";
    try {
      // call background to perform delete (background will implement safe trash)
      const res = await chrome.runtime.sendMessage({
        type: "BATCH_TRASH",
        ids,
      });
      statusEl.textContent = res && res.success ? "Trashed" : "Delete failed";
      await refreshSignInStatus();
    } catch (e) {
      statusEl.textContent = "Error: " + e.message;
    }
    deleteBtn.disabled = false;
  });

  searchBtn.addEventListener("click", async () => {
    const q = buildQuery();
    resultsEl.textContent = "";
    statusEl.textContent = "Searching...";
    try {
      // Prefer client if available
      let resp;
      if (window.GmailClient) {
        resp = await window.GmailClient.listMessages({ q, maxResults: 50 });
        await enrichMessages(resp);
      } else {
        resp = await chrome.runtime.sendMessage({ type: "SEARCH", query: q });
      }
      renderResults(resp);
    } catch (e) {
      resultsEl.textContent = "Error: " + e.message;
    }
    statusEl.textContent = "";
  });

  async function enrichMessages(resp) {
    if (!resp || !resp.messages) return resp;
    const ids = resp.messages.map((m) => m.id);
    // fetch metadata in parallel but limit concurrency (simple)
    const promises = ids.map((id) =>
      window.GmailClient.getMessage(id, "metadata", [
        "Subject",
        "From",
        "Date",
      ]).catch((e) => null)
    );
    const metas = await Promise.all(promises);
    resp.messages = resp.messages.map((m, idx) => {
      const meta = metas[idx];
      const headers = {};
      if (meta && meta.payload && meta.payload.headers) {
        meta.payload.headers.forEach((h) => {
          headers[h.name] = h.value;
        });
      }
      return {
        ...m,
        _meta: {
          subject: headers["Subject"],
          from: headers["From"],
          date: headers["Date"],
          snippet: meta ? meta.snippet : "",
        },
      };
    });
    return resp;
  }
});
