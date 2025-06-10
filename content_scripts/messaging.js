// Service d'envoi de messages LinkedIn via extension Chrome
class LinkedInMessagingService {
  constructor() {
    this.rateLimiter = new RateLimiter(20, 3600000); // 20 messages/heure
    this.messageQueue = [];
    this.isProcessing = false;
  }

  // Méthode principale pour envoyer un message
  async sendMessage(profileUrl, message, options = {}) {
    try {
      await this.rateLimiter.checkLimit();
      
      // Naviguer vers le profil
      await this.navigateToProfile(profileUrl);
      
      // Attendre le chargement de la page
      await this.waitForPageLoad();
      
      // Cliquer sur le bouton "Message"
      const messageButton = await this.findMessageButton();
      if (!messageButton) {
        throw new Error('Message button not found - user might not be connected');
      }
      
      messageButton.click();
      await this.delay(2000);
      
      // Écrire et envoyer le message
      await this.typeMessage(message);
      await this.delay(1000);
      
      if (options.sendImmediately !== false) {
        await this.clickSendButton();
        await this.delay(2000);
      }
      
      return {
        success: true,
        profileUrl,
        message,
        timestamp: new Date(),
        status: 'sent'
      };
      
    } catch (error) {
      console.error('Failed to send message:', error);
      return {
        success: false,
        profileUrl,
        message,
        error: error.message,
        timestamp: new Date(),
        status: 'failed'
      };
    }
  }

  // Navigation vers le profil LinkedIn
  async navigateToProfile(profileUrl) {
    if (window.location.href !== profileUrl) {
      window.location.href = profileUrl;
      await this.waitForPageLoad();
    }
  }

  // Attendre le chargement complet de la page
  async waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }

  // Trouver le bouton "Message"
  async findMessageButton() {
    const selectors = [
      'button[aria-label*="Message"]',
      'button[data-control-name="message"]',
      '.pv-s-profile-actions button:contains("Message")',
      '.message-anywhere-button',
      '[data-control-name="message"]'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && this.isElementVisible(button)) {
        return button;
      }
    }

    // Recherche par texte si les sélecteurs échouent
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent.toLowerCase().includes('message') && 
          this.isElementVisible(button)) {
        return button;
      }
    }

    return null;
  }

  // Vérifier si un élément est visible
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           window.getComputedStyle(element).display !== 'none';
  }

  // Écrire le message dans la zone de texte
  async typeMessage(message) {
    const textSelectors = [
      '.msg-form__contenteditable',
      '[data-artdeco-is-focused="true"]',
      '.msg-form__msg-content-container div[contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]'
    ];

    let textArea = null;
    
    // Attendre que la zone de texte apparaisse
    for (let i = 0; i < 10; i++) {
      for (const selector of textSelectors) {
        textArea = document.querySelector(selector);
        if (textArea && this.isElementVisible(textArea)) {
          break;
        }
      }
      if (textArea) break;
      await this.delay(500);
    }

    if (!textArea) {
      throw new Error('Message text area not found');
    }

    // Simuler la frappe humaine
    textArea.focus();
    await this.delay(500);
    
    // Effacer le contenu existant
    textArea.innerHTML = '';
    
    // Écrire le message caractère par caractère pour simuler la frappe humaine
    await this.typeTextHumanLike(textArea, message);
  }

  // Simulation de frappe humaine
  async typeTextHumanLike(element, text) {
    element.focus();
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Simuler les événements clavier
      const keydownEvent = new KeyboardEvent('keydown', {
        key: char,
        bubbles: true
      });
      
      const inputEvent = new InputEvent('input', {
        inputType: 'insertText',
        data: char,
        bubbles: true
      });
      
      element.dispatchEvent(keydownEvent);
      element.innerHTML += char;
      element.dispatchEvent(inputEvent);
      
      // Délai aléatoire entre les caractères (50-150ms)
      await this.delay(Math.random() * 100 + 50);
    }
    
    // Déclencher l'événement de changement
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Cliquer sur le bouton d'envoi
  async clickSendButton() {
    const sendSelectors = [
      'button[data-control-name="send"]',
      '.msg-form__send-button',
      'button[type="submit"]',
      'button[aria-label*="Send"]'
    ];

    let sendButton = null;
    
    for (const selector of sendSelectors) {
      sendButton = document.querySelector(selector);
      if (sendButton && !sendButton.disabled && this.isElementVisible(sendButton)) {
        break;
      }
    }

    if (!sendButton) {
      // Recherche par texte
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent.toLowerCase().includes('send') && 
            !button.disabled && this.isElementVisible(button)) {
          sendButton = button;
          break;
        }
      }
    }

    if (!sendButton) {
      throw new Error('Send button not found or disabled');
    }

    sendButton.click();
  }

  // Traitement en lot des messages
  async processBatchMessages(messageRequests) {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress');
    }

    this.isProcessing = true;
    const results = [];

    try {
      for (const request of messageRequests) {
        const result = await this.sendMessage(
          request.profileUrl, 
          request.message, 
          request.options
        );
        
        results.push(result);
        
        // Délai plus long entre les messages pour éviter la détection
        await this.delay(Math.random() * 30000 + 60000); // 1-1.5 minutes
        
        // Vérifier si on a été détecté/bloqué
        if (this.checkForBlocking()) {
          console.warn('Potential blocking detected, stopping batch');
          break;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  // Détection de blocage LinkedIn
  checkForBlocking() {
    const blockingIndicators = [
      'We\'ve restricted your account',
      'unusual activity',
      'verification required',
      'temporarily restricted',
      'security check'
    ];

    const pageText = document.body.innerText.toLowerCase();
    return blockingIndicators.some(indicator => 
      pageText.includes(indicator.toLowerCase())
    );
  }

  // Utilitaire de délai
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Rate Limiter pour éviter les restrictions
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds`);
    }
    
    this.requests.push(now);
  }
}

// Service de gestion des templates de messages
class MessageTemplateService {
  constructor() {
    this.templates = new Map();
  }

  // Ajouter un template
  addTemplate(name, template) {
    this.templates.set(name, template);
  }

  // Personnaliser un message avec les données du profil
  personalizeMessage(templateName, profileData) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    let message = template;
    
    // Remplacer les variables
    const variables = {
      '{{firstName}}': this.extractFirstName(profileData.name),
      '{{lastName}}': this.extractLastName(profileData.name),
      '{{fullName}}': profileData.name,
      '{{company}}': profileData.company,
      '{{position}}': profileData.position,
      '{{location}}': profileData.location
    };

    for (const [variable, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(variable, 'g'), value || '');
    }

    return message;
  }

  extractFirstName(fullName) {
    return fullName ? fullName.split(' ')[0] : '';
  }

  extractLastName(fullName) {
    const parts = fullName ? fullName.split(' ') : [];
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
}

// Export des services
window.LinkedInMessagingService = LinkedInMessagingService;
window.MessageTemplateService = MessageTemplateService;