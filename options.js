document.addEventListener('DOMContentLoaded', () => {
  const dryrun = document.getElementById('dryrun');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  // Load
  chrome.storage.local.get({dryRun: true}, (items) => {
    dryrun.checked = !!items.dryRun;
  });

  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({dryRun: dryrun.checked}, () => {
      status.textContent = 'Saved';
      setTimeout(() => status.textContent = '', 1500);
    });
  });
});
