const NOTE_MAX_LENGTH = 100;
const NOTES_PER_PAGE = 3; // Add this constant at the top

let sidebar;

class Sidebar {
  constructor() {
    this.API_URL = "http://localhost:5000";
    this.isUserExist = false;
    this.userId = "";
    this.token = "";
    this.notes = "";
    this.contactMethod = "";
    this.notesList = []; // Store notes
    this.notesCreated = false; // Add flag to track if notes were created
    this.pendingNotes = new Set(); // Ajouter un Set pour suivre les notes en attente
    this.suggestedTags = [];
    this.currentNotesPage = 1;

    this.initElements();
  }

  initElements() {
    const buttonConnect = document.getElementById("button-connect");
    const buttonClose = document.getElementById("button-close");
    const buttonRetry = document.getElementById("button-retry");
    this.buttonImport = document.getElementById("importButton");
    const buttonCloseProfil = document.getElementById("closeButton");
    this.loader = document.querySelector(".loader");
    this.notConnected = document.querySelector(".not-connected");
    this.sideBarContainer = document.querySelector(".sidebar-container");
    this.name = document.getElementById("name");
    this.description = document.getElementById("description");
    this.location = document.getElementById("location");
    this.education = document.getElementById("education");
    this.job = document.getElementById("job");
    this.linkedinUrl = document.getElementById("linkedinUrl");
    this.email = document.getElementById("email");
    this.phone = document.getElementById("phone");
    this.tagInput = document.getElementById("tagInput");
    this.addTagButton = document.getElementById("addTagButton");
    this.tagsContainer = document.getElementById("tagsContainer");
    this.notesInput = document.getElementById("notes");
    this.contactMethodSelect = document.getElementById("contactMethod");
    this.notesCharCount = document.getElementById("notesCharCount");
    this.saveNotesButton = document.getElementById("saveNotesButton");
    this.notesContainer = document.getElementById("notesContainer");
    this.suggestedTagsContainer = document.getElementById(
      "suggestedTagsContainer"
    );
    this.notification = document.getElementById("notification");

    this.loadMoreNotesButton = document.createElement("button");
    this.loadMoreNotesButton.className = "load-more-button";
    this.loadMoreNotesButton.textContent = "Voir plus";
    this.loadMoreNotesButton.style.display = "none";
    this.loadMoreNotesButton.addEventListener("click", () =>
      this.loadMoreNotes()
    );
    this.notesContainer.after(this.loadMoreNotesButton);

    buttonConnect.addEventListener(
      "click",
      this.handleUserConnection.bind(this)
    );
    buttonClose.addEventListener("click", this.closeSidePanel.bind(this));
    buttonRetry.addEventListener("click", this.handleRetry.bind(this));
    this.buttonImport.addEventListener("click", this.handleImport.bind(this));
    buttonCloseProfil.addEventListener("click", this.closeSidePanel.bind(this));
    this.addTagButton.addEventListener("click", this.addTag.bind(this));
    this.notesInput.addEventListener(
      "input",
      this.updateNotesCharCount.bind(this)
    );
    this.contactMethodSelect.addEventListener(
      "change",
      this.updateContactMethod.bind(this)
    );
    this.saveNotesButton.addEventListener("click", this.saveNotes.bind(this));
    this.tagInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.addTag();
      }
    });
  }

  handleUserConnection() {
    chrome.runtime.sendMessage({ type: "login" });
  }

  closeSidePanel() {
    window.close();
  }

  handleRetry() {
    this.notConnected.style.display = "none";
    const statusIndicator = document.getElementById("status-indicator");
    if (statusIndicator) {
      statusIndicator.style.display = "block";
    }
    this.init();
  }

  async createTagApi(token, tagName) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${token}`);

    const raw = JSON.stringify({
      tagName,
    });

    const requestOptions = {
      method: "PUT",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const data = await fetch(
      `${this.API_URL}/api/individuals/${this.userId}/add-tag`,
      requestOptions
    );
    const dataJson = await data.json();
    return dataJson;
  }

  async deleteTagApi(token, tagName) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${token}`);

    const raw = JSON.stringify({
      tagName,
    });

    const requestOptions = {
      method: "PUT",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    const data = await fetch(
      `${this.API_URL}/api/individuals/${this.userId}/remove-tag`,
      requestOptions
    );
    const dataJson = await data.json();
    return dataJson;
  }

  async deleteNoteApi(noteId) {
    try {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", `Bearer ${this.token}`);
      myHeaders.append("Accept", "application/json");

      const requestOptions = {
        method: "DELETE",
        headers: myHeaders,
        redirect: "follow",
      };

      const response = await fetch(
        `${this.API_URL}/api/individuals/${this.userId}/texts/${noteId}`,
        requestOptions
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  }

  mapNoteType(selectedType) {
    const typeMapping = {
      "Message LinkedIn": "message LinkedIn",
      Mail: "mail",
      Appel: "appel",
      "Prise de note": "prise de note",
      "Qualification de poste": "qualification de poste",
      "Appel Manqué": "appel manqué",
      Qualif: "qualif",
      "Biz dev": "biz dev",
    };

    const mappedType = typeMapping[selectedType];
    return mappedType || selectedType;
  }

  async createNoteApi(token, noteContent, noteType) {
    const validTypes = [
      "appel",
      "qualif",
      "message LinkedIn",
      "mail",
      "prise de note",
      "qualification de poste",
      "appel manqué",
      "biz dev",
    ];

    const mappedType = this.mapNoteType(noteType);

    if (!validTypes.includes(mappedType)) {
      alert(
        `Type de note invalide : ${noteType}. Veuillez sélectionner un type valide.`
      );
      return;
    }

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${token}`);

    const raw = JSON.stringify({
      content: noteContent,
      type: mappedType,
      isImportant: false,
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    try {
      const response = await fetch(
        `${this.API_URL}/api/individuals/${this.userId}/texts`,
        requestOptions
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create note: ${response.status} - ${errorText}`
        );
      }

      const dataJson = await response.json();
      const newNote = dataJson.text[dataJson.text.length - 1];
      return newNote;
    } catch (error) {
      console.error("Error in createNoteApi:", error);
      throw error;
    }
  }

  showNotification(message, duration = 3000) {
    this.notification.textContent = message;
    this.notification.classList.add("show");
    setTimeout(() => {
      this.notification.classList.remove("show");
    }, duration);
  }

  setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add("loading");
      button.disabled = true;
    } else {
      button.classList.remove("loading");
      button.disabled = false;
    }
  }

  async createUser() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${this.token}`);
    const picture = document.getElementById("profile-photo").src;

    const raw = JSON.stringify({
      Name: this.name.value || "",
      phoneNumber: this.phone.value || "",
      formation: this.education.value || "",
      email: this.email.value || "",
      company: this.job.value || "",
      jobTitle: this.description.value || "",
      city: this.location.value || "",
      resume: "null",
      linkedinUrl: this.linkedinUrl.value || "",
      photo: picture?.startsWith("http") ? picture : "",
    });

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    try {
      this.setButtonLoading(this.buttonImport, true);
      const data = await fetch(
        `${this.API_URL}/api/individuals`,
        requestOptions
      );
      const dataJson = await data.json();

      if (data.status === 201) {
        this.userId = dataJson._id;
        this.isUserExist = true;
        this.buttonImport.innerText = "Update";

        const statusIndicator = document.getElementById("status-indicator");
        statusIndicator.textContent = "Profil existant";
        statusIndicator.className = "status-indicator exist";

        const tags = this.getTagsArray();
        for (const tag of tags) {
          await this.createTagApi(this.token, tag);
        }

        const pendingNotesArray = Array.from(this.pendingNotes);
        this.notesContainer.innerHTML = "";
        this.notesList = [];

        for (const note of pendingNotesArray) {
          const createdNote = await this.createNoteApi(
            this.token,
            note.text,
            note.type
          );
          this.addNoteToContainer(
            createdNote.content,
            createdNote.type,
            createdNote._id
          );
        }

        this.pendingNotes.clear();
        this.showNotification("Utilisateur créé avec succès !");
      }

      return dataJson;
    } catch (error) {
      console.error("Error creating user:", error);
      this.showNotification(
        "Erreur lors de la création de l'utilisateur",
        5000
      );
      throw error;
    } finally {
      this.setButtonLoading(this.buttonImport, false);
    }
  }

  async updateUser() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${this.token}`);

    const raw = JSON.stringify({
      Name: this.name.value || "",
      email: this.email.value || "",
      phoneNumber: this.phone.value || "",
      company: this.job.value,
      formation: this.education.value || "",
      jobTitle: this.description.value || "",
      city: this.location.value || "",
      linkedinUrl: this.linkedinUrl.value || "",
    });

    const requestOptions = {
      method: "PUT",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    try {
      this.setButtonLoading(this.buttonImport, true);
      const data = await fetch(
        `${this.API_URL}/api/individuals/${this.userId}`,
        requestOptions
      );
      const dataJson = await data.json();
      if (data.status === 200) {
        this.userId = dataJson._id;
        this.isUserExist = true;
        this.showNotification("Utilisateur mis à jour avec succès !");
      }

      return dataJson;
    } catch (error) {
      console.error("Error updating user:", error);
      this.showNotification(
        "Erreur lors de la mise à jour de l'utilisateur",
        5000
      );
      throw error;
    } finally {
      this.setButtonLoading(this.buttonImport, false);
    }
  }

  getTagsArray() {
    const tags = [];
    const tagElements = this.tagsContainer.querySelectorAll(".tag");
    tagElements.forEach((tagElement) => {
      tags.push(tagElement.textContent.replace("×", "").trim());
    });
    return tags;
  }

  async handleImport() {
    const tags = this.getTagsArray();
    if (this.isUserExist) {
      const data = await this.updateUser();
    } else {
      const data = await this.createUser();
    }
  }

  async getDataProfile() {
    const data = await chrome.storage.local.get(["profileData"]);

    return data.profileData;
  }

  async checkIfUserExist(token, name, linkedinUrl, email) {
    try {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Authorization", `Bearer ${token}`);

      const raw = JSON.stringify({
        name,
        linkedinUrl,
        email,
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      };

      const data = await fetch(
        `${this.API_URL}/api/individuals/check-profile`,
        requestOptions
      );

      if (!data.ok) {
        return false;
      }

      const dataJson = await data.json();

      this.isUserExist = dataJson.exists;
      this.userId = dataJson.individualId;

      return dataJson.message;
    } catch (error) {
      console.error("Error checking user existence:", error);
      return false;
    }
  }

  async checkUser(data) {
    const token = await chrome.storage.local.get("token");
    const notConnected = document.querySelector(".not-connected");
    const statusIndicator = document.getElementById("status-indicator");
    const sidebarContainer = document.querySelector(".sidebar-container");
    this.token = token.token;

    // Réinitialiser les données
    this.name.value = "";
    this.description.value = "";
    this.location.value = "";
    this.education.value = "";
    this.job.value = "";
    this.linkedinUrl.value = "";
    this.email.value = "";
    this.phone.value = "";
    this.tagsContainer.innerHTML = "";
    this.notesContainer.innerHTML = "";
    this.notesList = [];
    this.pendingNotes.clear();
    this.buttonImport.innerText = "Import";
    this.isUserExist = false;
    this.userId = "";

    // S'assurer que le status indicator est visible avant de vérifier l'utilisateur
    if (statusIndicator) {
      statusIndicator.style.display = "block";
    }

    if (this.token) {
      const isUserExist = await this.checkIfUserExist(
        this.token,
        data.Name,
        data.linkedinUrl,
        data.email
      );

      if (isUserExist) {
        if (isUserExist === "Profil non trouvé dans la base de données") {
          this.loadInputsData(data);
          statusIndicator.textContent = "Nouveau profil";
          statusIndicator.className = "status-indicator not-exist";
          notConnected.style.display = "none";
          sidebarContainer.style.display = "block";
        } else {
          const user = await this.getUserById(this.userId, this.token);
          this.buttonImport.innerText = "Update";
          this.loadInputsData(user);
          statusIndicator.textContent = "Profil existant";
          statusIndicator.className = "status-indicator exist";
          notConnected.style.display = "none";
          sidebarContainer.style.display = "block";
        }
      } else {
        notConnected.style.display = "block";
        sidebarContainer.style.display = "none";
        // Ne pas cacher le status indicator, mais le mettre à jour avec un message d'erreur
        if (statusIndicator) {
          statusIndicator.textContent = "Erreur de connexion";
          statusIndicator.className = "status-indicator error";
        }
      }
    } else {
      notConnected.style.display = "block";
      sidebarContainer.style.display = "none";
      // Ne pas cacher le status indicator, mais le mettre à jour avec un message d'erreur
      if (statusIndicator) {
        statusIndicator.textContent = "Non connecté";
        statusIndicator.className = "status-indicator error";
      }
    }
  }

  async getUserById(userId, token) {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${token}`);

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    const data = await fetch(
      `${this.API_URL}/api/individuals/${userId}`,
      requestOptions
    );
    const dataJson = await data.json();

    return dataJson;
  }

  async loadInputsData(data) {
    if (data.photo) {
      const profilePhoto = document.getElementById("profile-photo");
      profilePhoto.src = data.photo;
      profilePhoto.style.display = "block";
    } else {
      const profilePhoto = document.getElementById("profile-photo");
      profilePhoto.style.display = "none";
    }

    this.name.value = data.Name || "";
    this.description.value = data.jobTitle || "";
    this.location.value = data.city || "";
    this.education.value = data.formation || "";
    this.job.value = data.company || "";
    this.linkedinUrl.value = data.linkedinUrl || "";
    this.email.value = data.email || "";
    this.phone.value = data.phoneNumber || "";

    this.tagsContainer.innerHTML = "";
    this.notesContainer.innerHTML = "";

    if (Array.isArray(data.tags)) {
      data.tags.forEach((tag) => {
        const tagElement = document.createElement("div");
        tagElement.className = "tag";
        tagElement.innerHTML = `
          ${tag.name}
          <span class="remove-tag">×</span>
        `;
        tagElement
          .querySelector(".remove-tag")
          .addEventListener("click", () => {
            this.removeTag(tag.name, tagElement);
          });
        this.tagsContainer.appendChild(tagElement);
      });
    }

    if (Array.isArray(data.text)) {
      this.pendingNotes.clear();
      this.notesList = data.text.map((note) => ({
        id: note._id,
        text: this.cleanHtmlText(note.content),
        type: note.type,
        date: new Date(note.createdAt).toLocaleDateString("fr-FR"),
      }));
      this.currentNotesPage = 1;
      this.displayNotes();
    }

    this.sideBarContainer.style.display = "block";
    this.loader.style.display = "none";
  }

  async init() {
    const data = await this.getDataProfile();
    await this.fetchSuggestedTags();
    await this.checkUser(data);
  }

  addTag() {
    const tagValue = this.tagInput.value.trim();
    if (tagValue) {
      const tagElement = document.createElement("div");
      tagElement.className = "tag";
      tagElement.innerHTML = `
        ${tagValue}
        <span class="remove-tag">×</span>
      `;
      tagElement.querySelector(".remove-tag").addEventListener("click", () => {
        this.removeTag(tagValue, tagElement);
      });

      this.tagsContainer.appendChild(tagElement);

      if (this.isUserExist) {
        this.createTagApi(this.token, tagValue).catch((error) => {
          alert("Une erreur est survenue lors de la création du tag.");
        });
      }

      this.tagInput.value = "";
    }
  }

  removeTag(tagName, element) {
    element.closest(".tag").remove();

    if (this.isUserExist) {
      this.deleteTagApi(this.token, tagName).catch((error) =>
        console.error("Error deleting tag:", error)
      );
    }
  }

  updateNotesCharCount() {
    const charCount = this.notesInput.value.length;
    this.notesCharCount.textContent = `${charCount}/500`;
  }

  updateContactMethod() {
    this.contactMethod = this.contactMethodSelect.value;
  }

  async saveNotes() {
    this.notes = this.notesInput.value.trim();
    const contactType = this.contactMethodSelect.value;

    if (this.notes) {
      if (this.isUserExist) {
        try {
          const createdNote = await this.createNoteApi(
            this.token,
            this.notes,
            contactType
          );

          this.addNoteToContainer(
            createdNote.content,
            createdNote.type,
            createdNote._id
          );

          this.notesInput.value = "";
          this.updateNotesCharCount();
        } catch (error) {
          alert("Erreur lors de la création de la note");
        }
      } else {
        const noteData = {
          text: this.notes,
          type: this.mapNoteType(contactType),
          date: new Date().toLocaleDateString("fr-FR"),
        };
        this.pendingNotes.add(noteData);
        this.addNoteToContainer(this.notes, contactType);

        this.notesInput.value = "";
        this.updateNotesCharCount();
      }
    } else {
      alert("Veuillez entrer des notes avant de sauvegarder.");
    }
  }

  cleanHtmlText(text) {
    if (!text) return "";
    const newText = text.replace(/<[^>]*>/g, "");
    return newText;
  }

  addNoteToContainer(noteText, noteType, noteId = null) {
    const currentDate = new Date().toLocaleDateString("fr-FR");
    const cleanedText = this.cleanHtmlText(noteText);

    this.notesList.unshift({
      id: noteId,
      text: cleanedText,
      type: noteType,
      date: currentDate,
    });

    this.displayNotes();
  }

  removeNoteFromContainer(noteElement, noteText) {
    noteElement.remove();
    this.notesList = this.notesList.filter((note) => note.text !== noteText);
    this.displayNotes(); // Refresh notes display after removal
  }

  loadMoreNotes() {
    this.currentNotesPage++;
    this.displayNotes();
  }

  displayNotes() {
    const startIndex = 0;
    const endIndex = this.currentNotesPage * NOTES_PER_PAGE;
    const visibleNotes = this.notesList.slice(startIndex, endIndex);

    this.notesContainer.innerHTML = "";

    visibleNotes.forEach((note) => {
      const isLongNote = note.text.length > NOTE_MAX_LENGTH;
      const truncatedText = isLongNote
        ? note.text.substring(0, NOTE_MAX_LENGTH) + "..."
        : note.text;

      const noteElement = document.createElement("div");
      noteElement.className = "note";
      if (note.id) {
        noteElement.dataset.noteId = note.id;
      }

      noteElement.innerHTML = `
        <div>
          <strong>${note.type}</strong> - ${note.date}<br />
          <span class="note-content ${
            isLongNote ? "truncated" : ""
          }" data-full-text="${note.text.replace(/"/g, "&quot;")}">
            ${truncatedText}
          </span>
        </div>
        <span class="remove-note">×</span>
      `;

      if (isLongNote) {
        const noteContent = noteElement.querySelector(".note-content");
        noteContent.addEventListener("click", function () {
          if (this.classList.contains("truncated")) {
            this.textContent = this.dataset.fullText;
            this.classList.remove("truncated");
          } else {
            this.textContent = truncatedText;
            this.classList.add("truncated");
          }
        });
      }

      noteElement
        .querySelector(".remove-note")
        .addEventListener("click", () => {
          if (this.isUserExist && note.id) {
            this.deleteNoteApi(note.id)
              .then(() => {
                this.removeNoteFromContainer(noteElement, note.text);
              })
              .catch((error) => {
                alert("Erreur lors de la suppression de la note");
              });
          } else {
            this.removeNoteFromContainer(noteElement, note.text);
          }
        });

      this.notesContainer.appendChild(noteElement);
    });

    // Show/hide load more button
    this.loadMoreNotesButton.style.display =
      this.notesList.length > endIndex ? "block" : "none";
  }

  async fetchSuggestedTags() {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${this.token}`);

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    try {
      const response = await fetch(
        `${this.API_URL}/api/tags/recent`,
        requestOptions
      );
      const tags = await response.json();
      this.suggestedTags = tags;
      this.displaySuggestedTags();
    } catch (error) {
      console.error("Error fetching suggested tags:", error);
    }
  }

  displaySuggestedTags() {
    if (!this.suggestedTagsContainer) return;

    this.suggestedTagsContainer.innerHTML = "";
    this.suggestedTags.forEach((tag) => {
      const tagButton = document.createElement("button");
      tagButton.className = "suggested-tag";
      tagButton.style.backgroundColor = "#4f46e5";
      tagButton.textContent = tag.name;
      tagButton.addEventListener("click", () => this.addSuggestedTag(tag.name));
      this.suggestedTagsContainer.appendChild(tagButton);
    });
  }

  addSuggestedTag(tagName) {
    const existingTags = this.getTagsArray();
    if (existingTags.includes(tagName)) return;

    const tagElement = document.createElement("div");
    tagElement.className = "tag";
    tagElement.innerHTML = `
      ${tagName}
      <span class="remove-tag">×</span>
    `;
    tagElement.querySelector(".remove-tag").addEventListener("click", () => {
      this.removeTag(tagName, tagElement);
    });

    this.tagsContainer.appendChild(tagElement);

    if (this.isUserExist) {
      this.createTagApi(this.token, tagName).catch((error) => {
        alert("Une erreur est survenue lors de la création du tag.");
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  sidebar = new Sidebar();
  await sidebar.init();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "loading") {
    const loadingOverlay = document.getElementById("loading-overlay");
    const content = document.getElementById("content");

    if (message.isLoading) {
      loadingOverlay.style.display = "flex";
      content.classList.remove("visible");
    } else {
      loadingOverlay.style.display = "none";
      content.classList.add("visible");
      // Charger les données une fois le chargement terminé
      sidebar.init();
    }
  }
});
