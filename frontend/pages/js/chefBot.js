// ChefBot modal interactions module
const ChefBot = (function () {
    // Stores the current recipe context for modal interactions
    let currentRecipe = null;
    // Flag to track if modal has been initialized with recipe context
    let isModalInitialized = false;

    // Retrieves references to all modal DOM elements
    function selectModalElements() {
        return {
            modal: document.getElementById("chefbot-modal"),
            chatContainer: document.getElementById("chefbotModalChat"),
            input: document.getElementById("chefbotModalInput"),
            sendBtn: document.getElementById("chefbotModalSend"),
            badge: document.querySelector(".chefbot-badge"),
            circleButton: document.querySelector(".chefbot-circle"),
            closeBtn: document.querySelector("#chefbot-modal .modal-close"),
        };
    }

    // Creates and appends a new message to the modal chat container
    function addModalMessage(text, isUser = false) {
        const els = selectModalElements();
        if (!els.chatContainer) return;
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;
        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);
        els.chatContainer.appendChild(messageDiv);
        // Auto-scroll to latest message
        els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
    }

    // Handles sending a message from the modal input field to the backend
    async function sendModalMessage() {
        const els = selectModalElements();
        if (!els.input) return;
        const message = els.input.value.trim();
        if (!message) return;

        // Display user message immediately
        addModalMessage(message, true);
        els.input.value = "";

        // Update button state while sending
        if (els.sendBtn) {
            els.sendBtn.disabled = true;
            els.sendBtn.textContent = "Sending...";
        }

        try {
        // Send message to backend /chat endpoint
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        const data = await response.json();
        // Display bot response
        if (data.status === "success") {
            addModalMessage(data.response, false);
        } else if (data.response) {
            addModalMessage(data.response, false);
        } else {
            addModalMessage("Error: " + (data.error || "invalid response"), false);
        }
        } catch (error) {
            addModalMessage("Connection error: " + error.message, false);
        }

        // Restore button state and focus input
        if (els.sendBtn) {
            els.sendBtn.disabled = false;
            els.sendBtn.textContent = "Send";
        }
        if (els.input) els.input.focus();
    }

    // Attaches event listeners to all modal interactive elements
    function attachModalHandlers() {
        const els = selectModalElements();

        if (els.badge)
        els.badge.addEventListener("click", (e) => {
            e.preventDefault();
            openModal();
        });

        if (els.circleButton)
        els.circleButton.addEventListener("click", (e) => {
            e.preventDefault();
            openModal();
        });
        // Close modal on close button click
        if (els.closeBtn) els.closeBtn.addEventListener("click", closeModal);
        if (els.sendBtn) els.sendBtn.addEventListener("click", sendModalMessage);
        // Handle input interactions: Enter to send, auto-expand textarea
        if (els.input) {
            els.input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendModalMessage();
                }
            });
            // Auto-expand textarea as user types
            els.input.addEventListener("input", function () {
                this.style.height = "auto";
                this.style.height = this.scrollHeight + "px";
            });
        }
    }

    // Opens the ChefBot modal and initializes recipe context on first open
    async function openModal() {
        const els = selectModalElements();
        // Verify recipe is loaded before opening
        if (!currentRecipe) {
            alert("Recipe not loaded. Try again shortly.");
            return;
        }

        // If already initialized, just show modal
        if (isModalInitialized) {
            els.modal.classList.remove("hidden");
            els.modal.setAttribute("aria-hidden", "false");
            if (els.input) els.input.focus();
            return;
        }

        // First time: send recipe context to backend for AI assistant initialization
        try {
        const resp = await fetch("/set_recipe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentRecipe),
        });

        if (!resp.ok) throw new Error("HTTP " + resp.status);
        await resp.json().catch(() => ({}));

        // Display modal with welcome message
        els.modal.classList.remove("hidden");
        els.modal.setAttribute("aria-hidden", "false");
        addModalMessage(
            "Hi! I'm Chef Bot Assistant 👨‍🍳. I'm ready to help you! Ask me anything about ingredients, cooking steps, cooking techniques, or how to customize the recipe!",
            false
        );
        isModalInitialized = true;
        if (els.input) els.input.focus();
        } catch (err) {
            console.error("Error setting recipe for ChefBot:", err);
            alert("Unable to send recipe to ChefBot. Try again.");
        }
    }

    // Closes the ChefBot modal
    function closeModal() {
        const els = selectModalElements();
        if (els.modal) {
            els.modal.classList.add("hidden");
            els.modal.setAttribute("aria-hidden", "true");
        }
    }

    return {
            // Initialize modal with recipe data
            initModal: function (recipe) {
            currentRecipe = recipe;
            isModalInitialized = false;
        },
            // Update recipe context for modal
            setRecipe: function (recipe) {
            currentRecipe = recipe;
            isModalInitialized = false;
        },
            // Public functions for modal control
            openModal: openModal,
            closeModal: closeModal,
            addMessage: addModalMessage,
            attachHandlers: attachModalHandlers,
            // Reset modal initialization state
            resetModalState: function () {
            isModalInitialized = false;
        },
    };
})();