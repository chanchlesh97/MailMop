// Inject a floating MailMop button into Gmail UI
(function () {
  if (window.__mailmop_injected) return;
  window.__mailmop_injected = true;

  const btn = document.createElement("button");
  btn.id = "mailmop-floating-btn";
  btn.textContent = "MailMop";
  btn.style.position = "fixed";
  btn.style.bottom = "24px";
  btn.style.right = "24px";
  btn.style.zIndex = 999999;
  btn.style.padding = "10px 14px";
  btn.style.background = "#1a73e8";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  btn.style.cursor = "pointer";

  // Create slide-out panel
  const panel = document.createElement("div");
  panel.id = "mailmop-slide-panel";
  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "-420px";
  panel.style.width = "420px";
  panel.style.height = "100%";
  panel.style.zIndex = 999998;
  panel.style.boxShadow = "0 0 12px rgba(0,0,0,0.3)";
  panel.style.transition = "right 240ms ease-in-out";
  panel.style.background = "#fff";

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("popup.html");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";

  panel.appendChild(iframe);
  document.body.appendChild(panel);

  let open = false;
  btn.addEventListener("click", () => {
    if (!open) {
      panel.style.right = "0";
      open = true;
      btn.textContent = "Close MailMop";
    } else {
      panel.style.right = "-420px";
      open = false;
      btn.textContent = "MailMop";
    }
  });

  document.body.appendChild(btn);
})();
