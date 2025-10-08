"use strict";

// ========================================
// SBS SELL CHAT - MESSENGER STYLE
// Backend: https://ai-parse-tech.fredbademosi1.workers.dev
// ========================================

const WORKER_URL = 'https://ai-parse-tech.fredbademosi1.workers.dev';

// State Management
const state = {
    conversationHistory: [],
    currentItem: {
        brand: null,
        size: null,
        condition: null,
        price: null
    },
    waitingForResponse: false,
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
};

// DOM Elements
const postSection = document.querySelector('.meText');
const inputPostText = document.getElementById("inputPostText");
const textSubmit = document.getElementById("textSubmit");
const audioTon = document.getElementById("audioTon");

// Profile customization
const profileNameShow = document.getElementById("profileNameShow");
const profileImages = document.querySelectorAll('.profileImages');
profileNameShow.innerText = "SBS Sell Bot";

// Update profile images to SBS logo/avatar
for (let i = 0; i < profileImages.length; i++) {
    profileImages[i].src = "images/profile/profile.jpg"; // You can update this to SBS logo
}

// Show/hide send button based on input
inputPostText.addEventListener("input", function() {
    if (inputPostText.value.trim() !== "") {
        textSubmit.classList.remove("disNone");
    } else {
        textSubmit.classList.add("disNone");
    }
});

// Handle Enter key
inputPostText.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (inputPostText.value.trim() !== "") {
            sendMessage();
        }
    }
});

// Handle send button click
textSubmit.addEventListener("click", sendMessage);

// Initialize with welcome message
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        addBotMessage("👋 Hi! I'm your SBS Sell assistant. Tell me what you'd like to sell!\n\nJust describe the item naturally - brand, size, condition, and price.");
    }, 500);
});

// Send message function
async function sendMessage() {
    if (state.waitingForResponse) return;
    
    const userMessage = inputPostText.value.trim();
    if (!userMessage) return;

    // Add user message to chat
    addUserMessage(userMessage);
    inputPostText.value = "";
    textSubmit.classList.add("disNone");

    // Show thinking indicator
    const thinkingId = showThinking();
    state.waitingForResponse = true;

    try {
        // Send to SBS worker
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: userMessage,
                conversationHistory: state.conversationHistory,
                sessionId: state.sessionId
            })
        });

        const data = await response.json();
        
        // Remove thinking indicator
        removeThinking(thinkingId);

        // Handle response
        handleWorkerResponse(data, userMessage);

    } catch (error) {
        removeThinking(thinkingId);
        addBotMessage("❌ Sorry, there was an error connecting to our system. Please try again.", 'error');
        console.error('Worker error:', error);
    } finally {
        state.waitingForResponse = false;
    }
}

// Handle worker response
function handleWorkerResponse(data, originalMessage) {
    // Update conversation history
    state.conversationHistory.push({
        role: 'user',
        content: originalMessage
    });

    if (data.reply) {
        state.conversationHistory.push({
            role: 'assistant',
            content: data.reply
        });
    }

    // Handle typo corrections
    if (data.typoCorrections && data.typoCorrections.length > 0) {
        showTypoCorrections(data.typoCorrections, originalMessage);
        return;
    }

    // Handle item state updates
    if (data.itemState) {
        state.currentItem = { ...state.currentItem, ...data.itemState };
    }

    // Show reply
    if (data.reply) {
        addBotMessage(data.reply);
    }

    // Check if item is complete
    if (data.readyToSubmit) {
        setTimeout(() => {
            showConfirmation();
        }, 1000);
    }
}

// Show typo corrections
function showTypoCorrections(corrections, originalMessage) {
    let correctionText = "🔍 I noticed some possible typos:\n\n";
    
    corrections.forEach((correction, index) => {
        correctionText += `${index + 1}. "${correction.original}" → "${correction.suggested}"\n`;
    });

    correctionText += "\nWould you like me to use these corrections?";

    addBotMessage(correctionText, 'correction');

    // Add action buttons
    setTimeout(() => {
        addCorrectionButtons(corrections, originalMessage);
    }, 300);
}

// Add correction action buttons
function addCorrectionButtons(corrections, originalMessage) {
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('postYour');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('textDiv', 'correction-buttons');
    textDiv.style.cssText = 'display: flex; gap: 10px; padding: 10px;';
    
    // Accept button
    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept';
    acceptBtn.style.cssText = 'flex: 1; padding: 10px; background: #28a745; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;';
    acceptBtn.onclick = () => acceptCorrections(corrections, originalMessage, buttonContainer);
    
    // Reject button
    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Keep Original';
    rejectBtn.style.cssText = 'flex: 1; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;';
    rejectBtn.onclick = () => rejectCorrections(originalMessage, buttonContainer);
    
    textDiv.appendChild(acceptBtn);
    textDiv.appendChild(rejectBtn);
    buttonContainer.appendChild(textDiv);
    postSection.appendChild(buttonContainer);
    postSection.scrollTop = postSection.scrollHeight;
}

// Accept corrections
async function acceptCorrections(corrections, originalMessage, buttonContainer) {
    buttonContainer.remove();
    
    let correctedMessage = originalMessage;
    corrections.forEach(correction => {
        const regex = new RegExp(correction.original, 'gi');
        correctedMessage = correctedMessage.replace(regex, correction.suggested);
    });

    addBotMessage(`✓ Great! Using: "${correctedMessage}"`);
    
    // Resend with corrections
    const thinkingId = showThinking();
    state.waitingForResponse = true;

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: correctedMessage,
                conversationHistory: state.conversationHistory,
                sessionId: state.sessionId,
                typosAccepted: true
            })
        });

        const data = await response.json();
        removeThinking(thinkingId);
        handleWorkerResponse(data, correctedMessage);

    } catch (error) {
        removeThinking(thinkingId);
        addBotMessage("❌ Error processing corrections. Please try again.", 'error');
    } finally {
        state.waitingForResponse = false;
    }
}

// Reject corrections
async function rejectCorrections(originalMessage, buttonContainer) {
    buttonContainer.remove();
    addBotMessage("✓ Okay, keeping your original message.");

    const thinkingId = showThinking();
    state.waitingForResponse = true;

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: originalMessage,
                conversationHistory: state.conversationHistory,
                sessionId: state.sessionId,
                typosRejected: true
            })
        });

        const data = await response.json();
        removeThinking(thinkingId);
        handleWorkerResponse(data, originalMessage);

    } catch (error) {
        removeThinking(thinkingId);
        addBotMessage("❌ Error processing message. Please try again.", 'error');
    } finally {
        state.waitingForResponse = false;
    }
}

// Show confirmation modal
function showConfirmation() {
    const summary = `
📦 <strong>Item Summary:</strong><br><br>
<strong>Brand:</strong> ${state.currentItem.brand || 'Not specified'}<br>
<strong>Size:</strong> ${state.currentItem.size || 'Not specified'}<br>
<strong>Condition:</strong> ${state.currentItem.condition || 'Not specified'}<br>
<strong>Price:</strong> ${state.currentItem.price || 'Not specified'}<br><br>
Is this correct?
    `;

    addBotMessage(summary);
    
    setTimeout(() => {
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('postYour');
        
        const textDiv = document.createElement('div');
        textDiv.classList.add('textDiv', 'confirmation-buttons');
        textDiv.style.cssText = 'display: flex; gap: 10px; padding: 10px;';
        
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '✓ Submit Item';
        confirmBtn.style.cssText = 'flex: 1; padding: 12px; background: #1B6CFF; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 14px;';
        confirmBtn.onclick = () => submitItem(buttonContainer);
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = '✎ Make Changes';
        editBtn.style.cssText = 'flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 14px;';
        editBtn.onclick = () => editItem(buttonContainer);
        
        textDiv.appendChild(confirmBtn);
        textDiv.appendChild(editBtn);
        buttonContainer.appendChild(textDiv);
        postSection.appendChild(buttonContainer);
        postSection.scrollTop = postSection.scrollHeight;
    }, 500);
}

// Submit item
async function submitItem(buttonContainer) {
    buttonContainer.remove();
    
    const thinkingId = showThinking();

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "SUBMIT_ITEM",
                itemDetails: state.currentItem,
                conversationHistory: state.conversationHistory,
                sessionId: state.sessionId
            })
        });

        const data = await response.json();
        removeThinking(thinkingId);

        if (data.success || data.accepted) {
            addBotMessage("🎉 Awesome! Your item has been submitted successfully!\n\nOur team will review it and get back to you soon. Thanks for choosing SBS!", 'success');
            
            // Reset state for new item
            setTimeout(() => {
                addBotMessage("Want to sell another item? Just tell me about it!");
                state.currentItem = { brand: null, size: null, condition: null, price: null };
                state.conversationHistory = [];
            }, 2000);
        } else {
            addBotMessage(data.reply || "Item submitted! We'll be in touch soon.", 'success');
        }

    } catch (error) {
        removeThinking(thinkingId);
        addBotMessage("❌ There was an error submitting your item. Please try again.", 'error');
        console.error('Submission error:', error);
    }
}

// Edit item
function editItem(buttonContainer) {
    buttonContainer.remove();
    addBotMessage("No problem! What would you like to change? Just tell me the updated details.");
}

// Add user message to chat
function addUserMessage(message) {
    const postDiv = document.createElement('div');
    postDiv.classList.add('postMe');
    
    const emptyDiv = document.createElement('div');
    const textDiv = document.createElement('div');
    textDiv.classList.add('textDiv');
    
    const p = document.createElement('p');
    p.textContent = message;
    
    textDiv.appendChild(p);
    postDiv.appendChild(emptyDiv);
    postDiv.appendChild(textDiv);
    postSection.appendChild(postDiv);
    
    // Play sound
    if (audioTon) {
        audioTon.play().catch(e => console.log('Audio play failed:', e));
    }
    
    // Scroll to bottom
    postSection.scrollTop = postSection.scrollHeight;
}

// Add bot message to chat
function addBotMessage(message, type = 'normal') {
    const postDiv = document.createElement('div');
    postDiv.classList.add('postYour');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('textDiv');
    
    if (type === 'error') {
        textDiv.style.background = '#fee';
        textDiv.style.color = '#c00';
    } else if (type === 'success') {
        textDiv.style.background = '#efe';
        textDiv.style.color = '#060';
    } else if (type === 'correction') {
        textDiv.style.background = '#fff3cd';
        textDiv.style.color = '#856404';
    }
    
    const p = document.createElement('p');
    p.innerHTML = message.replace(/\n/g, '<br>');
    
    const imageDiv = document.createElement('div');
    imageDiv.classList.add('imagesDivMini');
    
    const img = document.createElement('img');
    img.classList.add('profileImages');
    img.src = "images/profile/profile.jpg";
    
    imageDiv.appendChild(img);
    textDiv.appendChild(p);
    textDiv.appendChild(imageDiv);
    postDiv.appendChild(textDiv);
    postSection.appendChild(postDiv);
    
    // Scroll to bottom
    postSection.scrollTop = postSection.scrollHeight;
}

// Show thinking indicator
function showThinking() {
    const thinkingId = `thinking_${Date.now()}`;
    const postDiv = document.createElement('div');
    postDiv.classList.add('postYour');
    postDiv.id = thinkingId;
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('textDiv');
    
    const p = document.createElement('p');
    p.innerHTML = '<span class="thinking-dots">●</span><span class="thinking-dots">●</span><span class="thinking-dots">●</span>';
    p.style.cssText = 'font-size: 24px; letter-spacing: 3px;';
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        .thinking-dots {
            animation: thinkingPulse 1.4s infinite;
            opacity: 0.3;
        }
        .thinking-dots:nth-child(2) {
            animation-delay: 0.2s;
        }
        .thinking-dots:nth-child(3) {
            animation-delay: 0.4s;
        }
        @keyframes thinkingPulse {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    const imageDiv = document.createElement('div');
    imageDiv.classList.add('imagesDivMini');
    
    const img = document.createElement('img');
    img.classList.add('profileImages');
    img.src = "images/profile/profile.jpg";
    
    imageDiv.appendChild(img);
    textDiv.appendChild(p);
    textDiv.appendChild(imageDiv);
    postDiv.appendChild(textDiv);
    postSection.appendChild(postDiv);
    
    postSection.scrollTop = postSection.scrollHeight;
    
    return thinkingId;
}

// Remove thinking indicator
function removeThinking(thinkingId) {
    const thinkingElement = document.getElementById(thinkingId);
    if (thinkingElement) {
        thinkingElement.remove();
    }
}
