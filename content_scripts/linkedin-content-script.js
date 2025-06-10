function isProfilePage() {
  return window.location.pathname.startsWith("/in/");
}

function getUsernameFromUrl() {
  return window.location.pathname.split("/")[2];
}

function addImportButton() {
  if (document.getElementById("cognito-import-button")) {
    return;
  }

  const containerButton = document.querySelector(
    "section > div.ph5 > div:last-child"
  );

  if (containerButton) {
    const buttonImport = document.createElement("button");
    const img = chrome.runtime.getURL("images/icon48.png");

    buttonImport.id = "cognito-import-button";
    buttonImport.style.display = "flex";
    buttonImport.style.alignItems = "center";
    buttonImport.style.justifyContent = "center";
    buttonImport.style.backgroundColor = "#4f46e5";
    buttonImport.style.color = "white";
    buttonImport.style.border = "none";
    buttonImport.style.borderRadius = "16px";
    buttonImport.style.padding = ".6rem 1.2rem";
    buttonImport.style.width = "32px";
    buttonImport.style.height = "32px";
    buttonImport.style.cursor = "pointer";

    const imgElement = document.createElement("img");
    imgElement.src = img;
    imgElement.alt = "Import Icon";
    imgElement.style.width = "24px";
    imgElement.style.height = "24px";

    buttonImport.appendChild(imgElement);
    buttonImport.addEventListener("click", handleImport);
    containerButton.appendChild(buttonImport);
  } else {
    setTimeout(addImportButton, 1000);
  }
}

async function handleImport() {
  try {
    chrome.runtime.sendMessage({ type: "open-sidebar" });

    const profilInformation = await getInformationProfil();
    const contactInformation = await getContactInformation();
    const education = await getEducation();
    const photo = extractProfilePhoto();

    const completeProfile = {
      ...profilInformation,
      ...education,
      ...contactInformation,
      photo: photo,
    };

    await chrome.storage.local.set({ profileData: completeProfile });

    await new Promise((resolve) => setTimeout(resolve, 100));

    chrome.runtime.sendMessage({ type: "import-complete" });

    return completeProfile;
  } catch (error) {
    return null;
  }
}

async function getContactInformation() {
  try {
    document.getElementById("top-card-text-details-contact-info").click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const sections = document.querySelectorAll(
      ".pv-contact-info__contact-type"
    );

    const contactInfo = {
      phoneNumber: "",
      email: "",
    };

    sections.forEach((section) => {
      const sectionTitle = section
        .querySelector(".pv-contact-info__header")
        ?.textContent?.trim();

      if (sectionTitle) {
        if (
          sectionTitle.includes("Phone") ||
          sectionTitle.includes("Téléphone")
        ) {
          const phoneElements = section
            .querySelector("ul")
            .querySelector("li")
            .querySelector("span");
          const phoneNumber = phoneElements?.textContent?.trim();
          if (phoneNumber) {
            contactInfo.phoneNumber = phoneNumber;
          }
        }

        if (
          sectionTitle.includes("E-mail") ||
          sectionTitle.includes("Courriel")
        ) {
          const emailElements = section.querySelector("div").querySelector("a");
          const email = emailElements?.textContent?.trim();
          if (email) {
            contactInfo.email = email;
          }
        }
      }
    });

    document.querySelector(".artdeco-modal__dismiss")?.click();
    return contactInfo;
  } catch (error) {
    return {
      phone: "",
      email: "",
    };
  }
}

function checkCurrentPage() {
  if (isProfilePage()) {
    setTimeout(addImportButton, 1000);
  } else {
    const existingButton = document.getElementById("cognito-import-button");
    if (existingButton) {
      existingButton.remove();
    }
  }
}

function getCsrfToken() {
  let csrfToken = document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith("JSESSIONID="));

  if (csrfToken) {
    csrfToken = csrfToken.split("=")[1].trim();
    csrfToken = csrfToken.replace(/"/g, "");
  } else {
    csrfToken = document.cookie
      .split(";")
      .find((cookie) => cookie.trim().startsWith("csrf-token="));

    if (csrfToken) {
      csrfToken = csrfToken.split("=")[1].trim().replace(/"/g, "");
    } else {
      return null;
    }
  }

  return csrfToken;
}

function formatLocation(location) {
  if (!location) return "";
  location = location.split(" et ")[0];
  location = location.split(",")[0];

  return location.trim();
}

function formatName(name) {
  if (!name) return "";

  return name
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function getInformationProfil() {
  const myHeaders = new Headers();
  const csrfToken = getCsrfToken();

  myHeaders.append("Accept", "application/vnd.linkedin.normalized+json+2.1");
  myHeaders.append("Accept-Language", "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3");
  myHeaders.append("Accept-Encoding", "gzip, deflate, br, zstd");
  myHeaders.append("x-li-lang", "fr_FR");
  myHeaders.append("csrf-token", csrfToken);
  myHeaders.append("x-restli-protocol-version", "2.0.0");
  myHeaders.append(
    "x-li-pem-metadata",
    "Voyager - Profile=profile-top-card-core"
  );
  myHeaders.append("Connection", "keep-alive");
  myHeaders.append("Referer", "https://www.linkedin.com/feed/");

  const username = getUsernameFromUrl();
  const urlLinkedin = document.location.href;

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    credentials: "include",
    redirect: "follow",
  };

  const url = `https://www.linkedin.com/voyager/api/graphql?variables=(vanityName:${username})&queryId=voyagerIdentityDashProfiles.ee32334d3bd69a1900a077b5451c646a`;

  const response = await fetch(url, requestOptions);
  const dataJson = await response.json();
  const profileUrn =
    dataJson.data.data.identityDashProfilesByMemberIdentity["*elements"][0];
  const profileUrnRaw =
    dataJson.data.data.identityDashProfilesByMemberIdentity["*elements"][0];
  const profileUrnEncoded = encodeURIComponent(profileUrnRaw);

  const profile = dataJson.included.find(
    (item) =>
      item["$type"] === "com.linkedin.voyager.dash.identity.profile.Profile" &&
      item.entityUrn === profileUrn
  );

  let location = "";

  if (profile.geoLocation && profile.geoLocation["*geo"]) {
    const geoUrn = profile.geoLocation["*geo"];
    const geoObject = dataJson.included.find(
      (item) => item.entityUrn === geoUrn
    );

    if (geoObject) {
      if (geoObject.defaultLocalizedNameWithoutCountryName) {
        location = formatLocation(
          geoObject.defaultLocalizedNameWithoutCountryName
        );
      } else if (geoObject.defaultLocalizedName) {
        location = formatLocation(geoObject.defaultLocalizedName);
      }
    }
  }

  const objectData = {
    Name:
      formatName(`${profile.firstName || ""} ${profile.lastName || ""}`) || "",
    linkedinUrl: urlLinkedin,
    jobTitle: profile.headline || "",
    profileUrn: profileUrnEncoded,
    city: location,
  };

  return objectData;
}

async function getEducation() {
  const myHeaders = new Headers();
  const csrfToken = getCsrfToken();
  const username = getUsernameFromUrl();

  myHeaders.append("Accept", "application/vnd.linkedin.normalized+json+2.1");
  myHeaders.append("Accept-Language", "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3");
  myHeaders.append("Accept-Encoding", "gzip, deflate, br, zstd");
  myHeaders.append("x-li-lang", "fr_FR");
  myHeaders.append(
    "x-li-page-instance",
    "urn:li:page:d_flagship3_profile_view_base;89j0x7JnQd2m0VuFffzznA=="
  );
  myHeaders.append("csrf-token", csrfToken);
  myHeaders.append("Connection", "keep-alive");
  myHeaders.append("Sec-Fetch-Dest", "empty");
  myHeaders.append("Sec-Fetch-Mode", "cors");
  myHeaders.append("Sec-Fetch-Site", "same-origin");

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  const response = await fetch(
    `https://www.linkedin.com/voyager/api/graphql?variables=(vanityName:${username})&queryId=voyagerIdentityDashProfiles.df542d77691239a0795555af70eb2fc5`,
    requestOptions
  );
  const dataJson = await response.json();

  const education = dataJson.included.filter(
    (item) => item["$type"] === "com.linkedin.voyager.dash.organization.School"
  );
  const job = dataJson.included.filter(
    (item) =>
      item["$type"] === "com.linkedin.voyager.dash.identity.profile.Position"
  );

  return {
    formation: education[0]?.name || "",
    company: job[0]?.companyName || "",
  };
}

function extractProfilePhoto() {
  let photo = "";
  const photoElement = document.querySelector(
    ".pv-top-card-profile-picture__image, .pv-top-card__photo img"
  );

  if (photoElement && photoElement.src) {
    photo = photoElement.src.trim();
  }

  return photo;
}

checkCurrentPage();

let lastUrl = location.href;

new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    checkCurrentPage();
  }
}).observe(document, { subtree: true, childList: true });
