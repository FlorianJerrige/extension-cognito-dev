const URL_LOGIN = "http://localhost:3000/app";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "login") {
    isUserLoggedIn();
  } else if (request.type === "open-sidebar") {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    chrome.runtime.sendMessage({ type: "loading", isLoading: true });
    sendResponse({ success: true });
  } else if (request.type === "import-complete") {
    chrome.runtime.sendMessage({ type: "loading", isLoading: false });
    sendResponse({ success: true });
  }
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "start-linkedin-automation") {
    // Démarrer l'automatisation LinkedIn
    const messageQueue = new LinkedInMessageQueue();
    messageQueue.startProcessing();
    sendResponse({ success: true });
  }
});

function isUserLoggedIn() {
  chrome.tabs.create({ url: URL_LOGIN }, (tab) => {
    const listener = function (tabId, changeInfo, updatedTab) {
      if (tabId === tab.id && changeInfo.status === "complete") {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: async () => {
              const token = localStorage.getItem("auth-token");
              if (token) {
                await chrome.storage.local.set({ token, loggedIn: true });
                alert("Vous êtes connecté à l’extension Cognito");
                return true;
              }
              return false;
            },
          },
          (results) => {
            if (results && results[0] && results[0].result === true) {
              chrome.tabs.onUpdated.removeListener(listener);
            }
          }
        );
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}
