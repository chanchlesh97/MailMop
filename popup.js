// Popup script for MailMop
document.addEventListener('DOMContentLoaded', () => {
  const signInBtn = document.getElementById('sign-in');
  const userInfo = document.getElementById('user-info');
  const authSection = document.getElementById('auth-section');
  const searchSection = document.getElementById('search-section');

  signInBtn.addEventListener('click', async () => {
    signInBtn.disabled = true;
    signInBtn.textContent = 'Signing in...';
    try {
      const res = await chrome.runtime.sendMessage({type: 'SIGN_IN'});
      if (res && res.email) {
        userInfo.style.display = 'block';
        userInfo.textContent = `Signed in as ${res.email}`;
        authSection.style.display = 'none';
        searchSection.style.display = 'block';
      } else {
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign in with Google';
      }
    } catch (err) {
      console.error(err);
      signInBtn.disabled = false;
      signInBtn.textContent = 'Sign in with Google';
    }
  });

  const searchBtn = document.getElementById('search');
  searchBtn.addEventListener('click', async () => {
    const query = document.getElementById('query').value;
    const results = document.getElementById('results');
    results.textContent = 'Searching...';
    try {
      const resp = await chrome.runtime.sendMessage({type: 'SEARCH', query});
      results.textContent = JSON.stringify(resp || {}, null, 2);
    } catch (e) {
      results.textContent = 'Error: ' + e.message;
    }
  });
});
