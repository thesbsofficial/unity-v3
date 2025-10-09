// ============================================
// 🚀 SBS SELL CHAT - INTEGRATED WITH BACKEND
// ============================================

const WORKER_URL = 'https://ai-parse-tech.fredbademosi1.workers.dev';

// DOM Elements
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");
const showGuideBtn = document.querySelector("#show-guide");
const guideOverlay = document.querySelector("#guide-overlay");
const confirmationModal = document.querySelector("#confirmation-modal");

// State Management
const state = {
  conversationHistory: [],
  currentStep: 1,
  maxSteps: 7,
  waitingForResponse: false,
  // GUIDED MODE: Step-by-step collection (ONLY MODE)
  guidedMode: true,
  guidedStep: 'itemType', // 7 steps: itemType -> brand -> size -> condition -> price -> details -> photos -> complete
  stepHistory: [], // Track steps for UNDO functionality
  currentItem: {
    itemType: null,
    brand: null,
    size: null,
    condition: null,
    price: null,
    details: null,
    photos: null
  }
};

const initialInputHeight = messageInput.scrollHeight;

// ============================================
// 🎯 INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeChat();
  setupEventListeners();
  
  // Show guide on first visit
  if (!localStorage.getItem('sbs_guide_completed')) {
    showGuide();
  } else {
    guideOverlay.classList.add('hidden');
  }
});

function initializeChat() {
  // GUIDED MODE: Start with item type question (7 STEPS)
  setTimeout(() => {
    addBotMessage(
      "👋 <strong>Welcome to SBS!</strong> I'll guide you through 7 quick steps to sell your item.",
      'success'
    );
  }, 500);
  
  setTimeout(() => {
    askForItemType();
  }, 1500);
}

// ============================================
// 🎯 GUIDED MODE QUESTIONS (7 STEPS)
// ============================================

function askForItemType() {
  state.guidedStep = 'itemType';
  state.stepHistory.push('itemType');
  addBotMessage(
    "🏷️ <strong>Step 1 of 7:</strong> What type of item are you selling?<br><br>" +
    "<em>Examples: Shoes, Trainers, Jacket, Hoodie, T-Shirt, Tracksuit, etc.</em>"
  );
}

function askForBrand() {
  state.guidedStep = 'brand';
  state.stepHistory.push('brand');
  addBotMessage(
    "📦 <strong>Step 2 of 7:</strong> What brand is your item?<br><br>" +
    "<em>Examples: Nike, North Face, HUGO, Asics, New Balance, OnCloud, etc.</em>"
  );
}

function askForSize() {
  state.guidedStep = 'size';
  state.stepHistory.push('size');
  addBotMessage(
    "📏 <strong>Step 3 of 7:</strong> What size is it?<br><br>" +
    "<em>Examples: UK-9, US-10, L, XL, 42, Medium, etc.</em>"
  );
}

function askForCondition() {
  state.guidedStep = 'condition';
  state.stepHistory.push('condition');
  addBotMessage(
    "✨ <strong>Step 4 of 7:</strong> What's the condition?<br><br>" +
    "<em>Examples: Brand new, Excellent, Good, Fair, Worn, etc.</em>"
  );
}

function askForPrice() {
  state.guidedStep = 'price';
  state.stepHistory.push('price');
  addBotMessage(
    "💰 <strong>Step 5 of 7:</strong> What price are you asking (in euros)?<br><br>" +
    "<em>Examples: 80, 120, 50 euros, €100, etc.</em>"
  );
}

function askForDetails() {
  state.guidedStep = 'details';
  state.stepHistory.push('details');
  addBotMessage(
    "📝 <strong>Step 6 of 7:</strong> Any additional details?<br><br>" +
    "<em>Examples: Original box, receipt included, limited edition, worn once, etc.</em>"
  );
}

function askForPhotos() {
  state.guidedStep = 'photos';
  state.stepHistory.push('photos');
  addBotMessage(
    "📸 <strong>Step 7 of 7:</strong> Do you have photos? (Type 'yes' or 'no')<br><br>" +
    "<em>We'll help you upload them after submission</em>"
  );
}

// ============================================
// ↩️ UNDO FUNCTIONALITY
// ============================================

function undoLastStep() {
  if (state.stepHistory.length === 0) {
    addBotMessage("❌ Nothing to undo!");
    return;
  }
  
  // Go back one step
  const currentStepIndex = state.stepHistory.indexOf(state.guidedStep);
  if (currentStepIndex > 0) {
    const previousStep = state.stepHistory[currentStepIndex - 1];
    state.guidedStep = previousStep;
    
    // Clear the current field
    state.currentItem[state.guidedStep] = null;
    
    addBotMessage("↩️ <strong>Going back...</strong>", 'info');
    
    // Re-ask the previous question
    setTimeout(() => {
      switch (previousStep) {
        case 'itemType': askForItemType(); break;
        case 'brand': askForBrand(); break;
        case 'size': askForSize(); break;
        case 'condition': askForCondition(); break;
        case 'price': askForPrice(); break;
        case 'details': askForDetails(); break;
        case 'photos': askForPhotos(); break;
      }
    }, 500);
  } else {
    addBotMessage("❌ You're already at the first step!");
  }
}

function addUndoButton() {
  const undoButtonHTML = `
    <button class="undo-btn" onclick="undoLastStep()">
      ↩️ UNDO Last Step
    </button>
  `;
  
  const undoDiv = document.createElement('div');
  undoDiv.className = 'undo-container';
  undoDiv.innerHTML = undoButtonHTML;
  chatBody.appendChild(undoDiv);
  scrollToBottom();
}

// ============================================
// 📨 EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Send message on button click ONLY (no Enter key)
  sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
  
  // Disable Enter key sending - allow Shift+Enter for new lines
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Block Enter key from sending
    }
  });
  
  // Auto-resize textarea
  messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
  });
  
  // Chatbot toggle
  chatbotToggler.addEventListener("click", () => {
    document.body.classList.toggle("show-chatbot");
  });
  
  closeChatbot.addEventListener("click", () => {
    document.body.classList.remove("show-chatbot");
  });
  
  // Show guide button
  showGuideBtn.addEventListener("click", showGuide);
  
  // Emoji picker
  setupEmojiPicker();
}

// ============================================
// 💬 MESSAGE HANDLING
// ============================================

function createMessageElement(content, ...classes) {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

async function handleOutgoingMessage(e) {
  e.preventDefault();
  
  const userMessage = messageInput.value.trim();
  if (!userMessage || state.waitingForResponse) return;
  
  // Clear input
  messageInput.value = "";
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.dispatchEvent(new Event("input"));
  
  // Add user message to UI
  const messageContent = `<div class="message-text">${escapeHtml(userMessage)}</div>`;
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  chatBody.appendChild(outgoingMessageDiv);
  scrollToBottom();
  
  // Store in history
  state.conversationHistory.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  });
  
  // Show thinking indicator
  showThinking();
  
  // Send to SBS worker
  try {
    state.waitingForResponse = true;
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        conversationHistory: state.conversationHistory,
        guidedMode: state.guidedMode,
        guidedStep: state.guidedStep,
        currentItem: state.currentItem
      })
    });
    
    const data = await response.json();
    console.log('✅ SBS Worker Response:', data);
    
    hideThinking();
    handleWorkerResponse(data);
    
  } catch (error) {
    console.error('❌ Error:', error);
    hideThinking();
    addBotMessage("Oops! Something went wrong. Please try again.", 'error');
  } finally {
    state.waitingForResponse = false;
  }
}

// ============================================
// 🤖 WORKER RESPONSE HANDLING
// ============================================

function handleWorkerResponse(data) {
  const { 
    accepted, 
    message, 
    typoCorrections, 
    parsed, 
    readyForSubmission,
    missingFields 
  } = data;
  
  // Handle typo corrections
  if (typoCorrections && Object.keys(typoCorrections).length > 0) {
    showTypoCorrections(typoCorrections, data);
    return;
  }
  
  // GUIDED MODE: Process step-by-step
  if (state.guidedMode) {
    handleGuidedResponse(data);
    return;
  }
  
  // Ready for submission
  if (readyForSubmission && parsed) {
    updateItemState(parsed);
    addBotMessage(message || "Perfect! Let me show you a summary...");
    setTimeout(() => {
      showConfirmation(parsed);
    }, 800);
    return;
  }
  
  // Accepted message
  if (accepted) {
    if (parsed) updateItemState(parsed);
    addBotMessage(message || "Got it! What else can you tell me?", 'success');
    
    // Show missing fields
    if (missingFields && missingFields.length > 0) {
      setTimeout(() => {
        addBotMessage(`I still need: <strong>${missingFields.join(', ')}</strong>`);
      }, 1000);
    }
    return;
  }
  
  // Default response
  addBotMessage(message || "I didn't quite get that. Could you rephrase?");
}

// ============================================
// 🎯 GUIDED MODE HANDLER (7 STEPS + UNDO)
// ============================================

function handleGuidedResponse(data) {
  const { accepted, parsed, message } = data;
  
  // Extract what we got from the worker
  if (parsed) updateItemState(parsed);
  
  // Process based on current step
  switch (state.guidedStep) {
    case 'itemType':
      if (state.currentItem.itemType || parsed?.itemType) {
        const itemType = state.currentItem.itemType || parsed.itemType;
        addBotMessage(`✅ Item Type: <strong>${itemType}</strong>`, 'success');
        addUndoButton();
        setTimeout(() => askForBrand(), 1000);
      } else {
        addBotMessage("I didn't catch the item type. Could you try again?<br><em>Examples: Shoes, Jacket, Hoodie, Trainers</em>");
      }
      break;
    
    case 'brand':
      if (state.currentItem.brand) {
        addBotMessage(`✅ Brand: <strong>${state.currentItem.brand}</strong>`, 'success');
        addUndoButton();
        setTimeout(() => askForSize(), 1000);
      } else {
        addBotMessage("I didn't catch the brand. Could you try again?<br><em>Examples: Nike, North Face, HUGO, Asics</em>");
      }
      break;
      
    case 'size':
      if (state.currentItem.size) {
        addBotMessage(`✅ Size: <strong>${state.currentItem.size}</strong>`, 'success');
        addUndoButton();
        setTimeout(() => askForCondition(), 1000);
      } else {
        addBotMessage("I didn't catch the size. Could you try again?<br><em>Examples: UK-9, L, 42, Medium</em>");
      }
      break;
      
    case 'condition':
      if (state.currentItem.condition) {
        addBotMessage(`✅ Condition: <strong>${state.currentItem.condition}</strong>`, 'success');
        addUndoButton();
        setTimeout(() => askForPrice(), 1000);
      } else {
        addBotMessage("I didn't catch the condition. Could you try again?<br><em>Examples: Brand new, Excellent, Good, Fair</em>");
      }
      break;
      
    case 'price':
      if (state.currentItem.price) {
        addBotMessage(`✅ Price: <strong>${state.currentItem.price}</strong>`, 'success');
        addUndoButton();
        setTimeout(() => askForDetails(), 1000);
      } else {
        addBotMessage("I didn't catch the price. Could you try again?<br><em>Examples: 80, 120 euros, €100</em>");
      }
      break;
      
    case 'details':
      // Details are optional, accept anything
      const details = state.currentItem.details || parsed?.details || 'None';
      state.currentItem.details = details;
      addBotMessage(`✅ Details noted: <strong>${details}</strong>`, 'success');
      addUndoButton();
      setTimeout(() => askForPhotos(), 1000);
      break;
      
    case 'photos':
      // Photos response is just yes/no
      const photos = state.currentItem.photos || parsed?.photos || 'Not specified';
      state.currentItem.photos = photos;
      addBotMessage(`✅ Photos: <strong>${photos}</strong>`, 'success');
      addUndoButton();
      setTimeout(() => {
        showCompletionOptions();
      }, 1000);
      break;
  }
}

// ============================================
// 🎯 COMPLETION OPTIONS (STEP 8)
// ============================================

function showCompletionOptions() {
  const optionsHTML = `
    <div style="margin: 20px 0;">
      <strong>🎉 All steps complete! What would you like to do?</strong>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
      <button class="option-btn" onclick="addMoreDetail()">
        📝 Add More Detail
      </button>
      <button class="option-btn" onclick="addMoreItems()">
        ➕ Add More Items
      </button>
      <button class="option-btn primary" onclick="finishSubmission()">
        ✅ Finish & Submit
      </button>
    </div>
  `;
  
  addBotMessage(optionsHTML);
}

window.addMoreDetail = function() {
  const messageContent = `<div class="message-text">📝 Add More Detail</div>`;
  const userDiv = createMessageElement(messageContent, "user-message");
  chatBody.appendChild(userDiv);
  scrollToBottom();
  
  addBotMessage("Sure! Which step would you like to add more detail to?");
  setTimeout(() => {
    addBotMessage("Type the step name: <strong>item type, brand, size, condition, price, details, or photos</strong>");
  }, 500);
};

window.addMoreItems = function() {
  const messageContent = `<div class="message-text">➕ Add More Items</div>`;
  const userDiv = createMessageElement(messageContent, "user-message");
  chatBody.appendChild(userDiv);
  scrollToBottom();
  
  // Reset for new item
  state.currentItem = {
    itemType: null,
    brand: null,
    size: null,
    condition: null,
    price: null,
    details: null,
    photos: null
  };
  state.stepHistory = [];
  
  setTimeout(() => {
    addBotMessage("Great! Let's add another item. 🎉", 'success');
  }, 500);
  setTimeout(() => {
    askForItemType();
  }, 1500);
};

window.finishSubmission = function() {
  const messageContent = `<div class="message-text">✅ Finish & Submit</div>`;
  const userDiv = createMessageElement(messageContent, "user-message");
  chatBody.appendChild(userDiv);
  scrollToBottom();
  
  setTimeout(() => {
    addBotMessage("Perfect! Let me show you a summary of your item...", 'success');
  }, 500);
  setTimeout(() => {
    showConfirmation(state.currentItem);
  }, 1500);
};

function showTypoCorrections(corrections, fullData) {
  const correctionList = Object.keys(corrections).map(word => 
    `<strong>"${word}"</strong> → <strong>"${corrections[word]}"</strong>`
  ).join('<br>');
  
  const messageId = `correction-${Date.now()}`;
  addBotMessage(
    `I noticed some possible typos:<br><br>${correctionList}<br><br>Should I fix these?`,
    'correction',
    messageId
  );
  
  // Add correction buttons
  setTimeout(() => {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'correction-buttons';
      buttonsDiv.innerHTML = `
        <button class="correction-btn accept" onclick="acceptCorrections(${JSON.stringify(corrections).replace(/"/g, '&quot;')})">
          ✓ Yes, fix them
        </button>
        <button class="correction-btn reject" onclick="rejectCorrections()">
          ✗ No, keep as is
        </button>
      `;
      messageElement.querySelector('.message-text').appendChild(buttonsDiv);
    }
  }, 100);
}

window.acceptCorrections = async function(corrections) {
  const lastUserMessage = state.conversationHistory[state.conversationHistory.length - 1].content;
  let correctedMessage = lastUserMessage;
  
  Object.keys(corrections).forEach(typo => {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    correctedMessage = correctedMessage.replace(regex, corrections[typo]);
  });
  
  // Add user's confirmation
  const messageContent = `<div class="message-text">✓ Yes, fix them</div>`;
  const confirmDiv = createMessageElement(messageContent, "user-message");
  chatBody.appendChild(confirmDiv);
  scrollToBottom();
  
  // Resend with corrections
  showThinking();
  
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: correctedMessage,
        conversationHistory: state.conversationHistory,
        corrected: true,
        guidedMode: state.guidedMode,
        guidedStep: state.guidedStep
      })
    });
    
    const data = await response.json();
    hideThinking();
    handleWorkerResponse(data);
    
  } catch (error) {
    console.error('Error:', error);
    hideThinking();
    addBotMessage("Oops! Something went wrong.", 'error');
  }
};

window.rejectCorrections = function() {
  const messageContent = `<div class="message-text">✗ No, keep as is</div>`;
  const rejectDiv = createMessageElement(messageContent, "user-message");
  chatBody.appendChild(rejectDiv);
  scrollToBottom();
  
  addBotMessage("Got it! Keeping it as you wrote it. Try answering the question again.");
};

function updateItemState(parsed) {
  if (parsed.itemType) state.currentItem.itemType = parsed.itemType;
  if (parsed.brand) state.currentItem.brand = parsed.brand;
  if (parsed.size) state.currentItem.size = parsed.size;
  if (parsed.condition) state.currentItem.condition = parsed.condition;
  if (parsed.price) state.currentItem.price = parsed.price;
  if (parsed.details) state.currentItem.details = parsed.details;
  if (parsed.photos) state.currentItem.photos = parsed.photos;
}

// ============================================
// 💬 UI HELPER FUNCTIONS
// ============================================

function addBotMessage(text, type = '', id = '') {
  const messageContent = `
    <svg 
      class="bot-avatar"
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 1024 1024"
    >
      <path
        d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
      ></path>
    </svg>
    <div class="message-text ${type}" ${id ? `id="${id}"` : ''}>${text}</div>
  `;
  
  const botMessageDiv = createMessageElement(messageContent, "bot-message");
  chatBody.appendChild(botMessageDiv);
  scrollToBottom();
}

function showThinking() {
  const thinkingContent = `
    <svg 
      class="bot-avatar"
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 1024 1024"
    >
      <path
        d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
      ></path>
    </svg>
    <div class="message-text">
      <div class="thinking-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
  `;
  
  const thinkingDiv = createMessageElement(thinkingContent, "bot-message", "thinking");
  chatBody.appendChild(thinkingDiv);
  scrollToBottom();
}

function hideThinking() {
  const thinkingMessage = chatBody.querySelector(".bot-message.thinking");
  if (thinkingMessage) {
    thinkingMessage.remove();
  }
}

function scrollToBottom() {
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// ✅ CONFIRMATION MODAL
// ============================================

function showConfirmation(parsed) {
  const summary = document.getElementById('item-summary');
  summary.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Item Type</span>
      <span class="summary-value">${parsed.itemType || 'Not specified'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Brand</span>
      <span class="summary-value">${parsed.brand || 'Not specified'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Size</span>
      <span class="summary-value">${parsed.size || 'Not specified'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Condition</span>
      <span class="summary-value">${parsed.condition || 'Not specified'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Price</span>
      <span class="summary-value">${parsed.price || 'Not specified'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Details</span>
      <span class="summary-value">${parsed.details || 'None'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Photos</span>
      <span class="summary-value">${parsed.photos || 'Not specified'}</span>
    </div>
  `;
  
  confirmationModal.classList.add('active');
}

window.closeConfirmation = function() {
  confirmationModal.classList.remove('active');
  addBotMessage('No problem! Feel free to add more details or start over.');
};

window.submitItem = async function() {
  confirmationModal.classList.remove('active');
  showThinking();
  
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'SUBMIT',
        conversationHistory: state.conversationHistory,
        finalSubmission: true,
        itemData: state.currentItem
      })
    });
    
    const data = await response.json();
    hideThinking();
    
    addBotMessage(
      "🎉 <strong>Awesome!</strong> Your item has been submitted to SBS.<br><br>" +
      "We'll review it and get back to you soon via WhatsApp or email!",
      'success'
    );
    
    // Reset state for next item
    setTimeout(() => {
      addBotMessage("Want to sell another item? Let's start again! 👇", 'success');
      state.currentItem = { brand: null, size: null, condition: null, price: null };
      state.guidedStep = 'brand';
    }, 2000);
    
    setTimeout(() => {
      askForBrand();
    }, 3000);
    
  } catch (error) {
    console.error('Error submitting:', error);
    hideThinking();
    addBotMessage("Oops! Couldn't submit right now. Please try again.", 'error');
  }
};

// ============================================
// 🎯 QUICK GUIDE
// ============================================

function showGuide() {
  guideOverlay.classList.remove('hidden');
  state.currentStep = 1;
}

window.closeGuide = function() {
  guideOverlay.classList.add('hidden');
  localStorage.setItem('sbs_guide_completed', 'true');
};

window.nextStep = function() {
  if (state.currentStep >= state.maxSteps) {
    closeGuide();
    return;
  }
  
  // Hide current
  document.querySelector(`.guide-step[data-step="${state.currentStep}"]`).classList.remove('active');
  document.querySelector(`.dot[data-step="${state.currentStep}"]`).classList.remove('active');
  
  // Show next
  state.currentStep++;
  document.querySelector(`.guide-step[data-step="${state.currentStep}"]`).classList.add('active');
  document.querySelector(`.dot[data-step="${state.currentStep}"]`).classList.add('active');
};

// ============================================
// 😊 EMOJI PICKER
// ============================================

function setupEmojiPicker() {
  const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
      const { selectionStart: start, selectionEnd: end } = messageInput;
      messageInput.setRangeText(emoji.native, start, end, "end");
      messageInput.focus();
    },
    onClickOutside: (e) => {
      if (e.target.id === "emoji-picker") {
        document.body.classList.toggle("show-emoji-picker");
      } else {
        document.body.classList.remove("show-emoji-picker");
      }
    }
  });
  
  document.querySelector(".chat-form").appendChild(picker);
  
  document.querySelector("#emoji-picker").addEventListener("click", () => {
    document.body.classList.toggle("show-emoji-picker");
  });
}

console.log('🚀 SBS Sell Chat initialized!');
console.log('Worker URL:', WORKER_URL);
