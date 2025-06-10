let isButtonListerActivate = false;

async function logoutUser() {
  await chrome.storage.local.remove(["token"]);
  await chrome.storage.local.remove(["loggedIn"]);
}

function handleUrl() {
  const logoutButton = document.getElementById("logout-button");
  if (!logoutButton) {
    isButtonListerActivate = false;
    return;
  }
  if (isButtonListerActivate) return;
  logoutButton.addEventListener("click", logoutUser);
  isButtonListerActivate = true;
}

const observer = new MutationObserver(() => {
  handleUrl();
});

observer.observe(document, {
  subtree: true,
  childList: true,
});

handleUrl();
