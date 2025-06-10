class PopupController {
  constructor() {
    this.loginButton = document.getElementById("login-button");
    this.loginContainer = document.querySelector(".login-container");
    this.connectedContainer = document.querySelector(".connected-container");

    this.init();
  }

  init() {
    this.loginButton.addEventListener("click", () => this.login());
    this.checkLoginStatus();
  }

  login() {
    chrome.runtime.sendMessage({ type: "login" });
  }

  checkLoginStatus() {
    chrome.storage.local.get(["loggedIn"], (result) => {
      if (result.loggedIn) {
        this.showConnectedUI();
      } else {
        this.showLoginUI();
      }
    });
  }

  showLoginUI() {
    this.loginContainer.style.display = "block";
    this.connectedContainer.style.display = "none";
  }

  showConnectedUI() {
    this.loginContainer.style.display = "none";
    this.connectedContainer.style.display = "flex";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});
