// Get recipe ID from URL
function getRecipeIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/recipe\/([a-f0-9]+)$/i);
    return match ? match[1] : null;
}

// Load session data from API
async function loadSessionData() {
    try {
        const response = await fetch('/api/session');
        if (response.ok) {
            sessionData = await response.json();
            updateCommentFormVisibility();
        }
    } catch (error) {
        console.error('Error loading session:', error);
        sessionData = { logged_in: false, user_name: '', user_avatar: '', role: '' };
        updateCommentFormVisibility();
    }
}

// Helper function to manage error/info messages in comment form
function manageCommentMessage(messageId, messageText, show) {
    let msgEl = document.getElementById(messageId);
    if (show && !msgEl) {
        msgEl = document.createElement('div');
        msgEl.id = messageId;
        msgEl.className = messageId === 'rating-error-msg' ? 'rating-error-message' : 'duplicate-comment-message';
        msgEl.textContent = messageText;
        const commentForm = document.querySelector('.comment-form');
        if (commentForm) {
            commentForm.insertBefore(msgEl, commentForm.firstChild);
        }
    }
    if (msgEl) {
        msgEl.style.display = show ? 'block' : 'none';
    }
}

// Update comment form visibility based on user role and login status
function updateCommentFormVisibility() {
    const loginPrompt = document.querySelector('.login-prompt');
    const commentForm = document.querySelector('.comment-form');

    if (!loginPrompt || !commentForm) return;

    // Chefs cannot rate or comment on recipes
    if (sessionData.role === 'chef') {
        loginPrompt.style.display = 'none';
        commentForm.style.display = 'none';
        return;
    }

    if (sessionData.logged_in) {
        loginPrompt.style.display = 'none';
        commentForm.style.display = 'block';
        manageCommentMessage('rating-error-msg', 'You must select a rating before commenting', false);
    } else {
        loginPrompt.style.display = 'block';
        commentForm.style.display = 'none';
    }
}

// Load recipe data from API and populate page
async function loadRecipe() {
    const recipeId = getRecipeIdFromUrl();
    if (!recipeId) {
        return;
    }

    // Load session data first
    await loadSessionData();

    try {
        const response = await fetch(`/api/recipes/${recipeId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const recipe = await response.json();
        populateRecipePage(recipe);
        
        // Check bookmark status for the current user
        await checkBookmarkStatus();
    } catch (error) {
        console.error('Error loading recipe:', error);
        document.querySelector('.app-container').innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Error during recipe loading</p>';
    }
}

// Global state: currently displayed recipe
let currentRecipe = null;

// Global state: session and user data
let sessionData = {
    logged_in: false,
    user_name: '',
    user_avatar: '',
    user_id: '',
    role: ''
};

let currentRating = 0;
let userHasCommented = false;  // Track if current user already commented on this recipe

// Populate recipe page with data
function populateRecipePage(recipe) {
    // Set recipe in ChefBot (only for non-chef users)
    if (sessionData.role !== 'chef') {
        ChefBot.setRecipe(recipe);
    }
    // Basic info
    document.getElementById('recipe-title').textContent = recipe.title;
    document.getElementById('chef-name').textContent = recipe.user_name;
    document.getElementById('chef-avatar').src = recipe.user_avatar;
    
    // Add click listener to author row to navigate to chef profile
    const authorRow = document.querySelector('.author-row');
    if (authorRow && recipe.chef_id) {
        authorRow.addEventListener('click', () => {
            window.location.href = `/chefProfile?id=${recipe.chef_id}`;
        });
    }
    document.getElementById('recipe-time').innerHTML = '<i class="bi bi-clock"></i> ' + (recipe.time || '--');
    document.getElementById('recipe-rating').innerHTML = '<i class="bi bi-star-fill"></i> ' + (recipe.rating || '0');
    document.getElementById('recipe-description').textContent = recipe.description || 'No description available';

    // Hero image (replace CSS background). Use common property names from DB.
    const heroImg = document.getElementById('recipe-hero-img');
    if (heroImg) {
        const src = recipe.image || recipe.image_url || recipe.photo || recipe.imageUrl || '';
        if (src) heroImg.src = src;
        heroImg.alt = recipe.title || 'Recipe image';
    }

    // Format nutrition values, convert to number and round
    function formatNutritionValue(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        var numValue = Number(String(value).replace(',', '.'));
        if (isNaN(numValue)) {
            return null;
        }
        return Math.round(numValue);
    }

    var calVal = formatNutritionValue(recipe.calories);
    var protVal = formatNutritionValue(recipe.protein);
    var carbsVal = formatNutritionValue(recipe.carbs);
    var fatsVal = formatNutritionValue(recipe.fats);

    // Update nutrition info
    document.getElementById('recipe-calories').textContent = calVal === null ? '--' : calVal;
    document.getElementById('recipe-protein').textContent = `Protein: ${protVal === null ? 0 : protVal} g`;
    document.getElementById('recipe-carbs').textContent = `Carbs: ${carbsVal === null ? 0 : carbsVal} g`;
    document.getElementById('recipe-fats').textContent = `Fats: ${fatsVal === null ? 0 : fatsVal} g`;

    // Update donut chart with nutrition percentages
    let donutEl = document.querySelector('.donut-chart');
    if (donutEl) {
        let p = protVal || 0;
        let c = carbsVal || 0;
        let f = fatsVal || 0;
        let totalGrams = p + c + f;

        if (totalGrams <= 0) {
            donutEl.style.background = 'conic-gradient(#eee 0% 100%)';
        } else {
            let proteinColor = '#e91e63';  // pink/red
            let carbsColor = '#fbc02d';    // yellow
            let fatsColor = '#009688';     // teal/green

            let pctProtein = Math.round((p / totalGrams) * 100);
            let pctCarbs = Math.round((c / totalGrams) * 100);
            let pctFats = 100 - pctProtein - pctCarbs;

            let endProtein = pctProtein;
            let endCarbs = pctProtein + pctCarbs;

            let gradient = 'conic-gradient(' + 
                proteinColor + ' 0% ' + endProtein + '%, ' + 
                carbsColor + ' ' + endProtein + '% ' + endCarbs + '%, ' + 
                fatsColor + ' ' + endCarbs + '% 100%)';
            donutEl.style.background = gradient;
        }
    }

    // Ingredients
    populateIngredients(recipe.ingredients || []);

    // Preparation steps
    populateSteps(recipe.preparationSteps || recipe.steps || []);

    // Science explanation (use dynamic container)
    populateScience(recipe.ingredients || []);

    // Load existing comments
    populateComments(recipe.comments || []);

    // Back button
    document.querySelector('.back-btn').addEventListener('click', () => {
        window.history.back();
    });

    // Hide bookmarks and ChefBot features for chef users
    if (sessionData.role === 'chef') {
        const bookmarkBtn = document.querySelector('.bookmark-btn');
        if (bookmarkBtn) {
            bookmarkBtn.style.display = 'none';
        }
        const chefbotContainer = document.querySelector('.chefbot-container');
        if (chefbotContainer) {
            chefbotContainer.style.display = 'none';
        }
    } else {
        // Initialize ChefBot modal for non-chef users
        ChefBot.initModal(recipe);
        ChefBot.attachHandlers();
    }
}

// Populate existing comments on recipe
function populateComments(comments) {
    let commentList = document.getElementById('comment-list');
    if (!commentList || !comments || !Array.isArray(comments)) return;

    commentList.innerHTML = '';
    userHasCommented = false;

    if (comments.length === 0) {
        return;
    }

    for (let i = 0; i < comments.length; i++) {
        let comment = comments[i];
        var commentEl = renderComment(comment);
        commentList.appendChild(commentEl);

        // Check if current user already commented
        if (sessionData.logged_in && sessionData.user_id && comment.user_id === sessionData.user_id) {
            userHasCommented = true;
        }
    }

    // Update form visibility based on whether user has commented
    updateCommentFormForDuplicateCheck();
}

// Populate ingredients list
function populateIngredients(ingredients) {
    let ingredientList = document.getElementById('ingredient-list');
    ingredientList.innerHTML = '';

    if (!ingredients || ingredients.length === 0) {
        ingredientList.innerHTML = '<p>No ingredients available</p>';
        return;
    }

    for (let i = 0; i < ingredients.length; i++) {
        let ing = ingredients[i];
        
        let div = document.createElement('div');
        div.className = 'ingredient-item';

        let name = ing.name || ing.ingredient || 'Unknown';
        let quantity = ing.quantity || '';
        let unit = ing.unit || '';

        div.innerHTML = '<div class="check-circle"><i class="bi bi-check"></i></div>' +
            '<span>' + name + ' - ' + quantity + ' ' + unit + '</span>';

        ingredientList.appendChild(div);
    }
}

// Populate preparation steps
function populateSteps(steps) {
    let stepsContainer = document.getElementById('steps-container');
    stepsContainer.innerHTML = '';

    if (!steps || steps.length === 0) {
        stepsContainer.innerHTML = '<p>No steps available</p>';
        return;
    }

    for (let i = 0; i < steps.length; i++) {
        let step = steps[i];
        let isObject = step && typeof step === 'object';
        
        let number = (isObject && step.stepNumber) ? step.stepNumber : (i + 1);
        let description = isObject ? (step.description || '') : (step || '');
        let imageUrl = isObject ? (step.image || null) : null;

        let div = document.createElement('div');
        div.className = 'prep-step';

        let numDiv = document.createElement('div');
        numDiv.className = 'step-number';
        numDiv.textContent = number;

        let contentDiv = document.createElement('div');
        contentDiv.className = 'step-content';

        let titleP = document.createElement('p');
        titleP.className = 'step-title';
        titleP.textContent = 'Step ' + number;

        let descP = document.createElement('p');
        descP.className = 'step-description';
        descP.textContent = description || 'No description';

        contentDiv.appendChild(titleP);
        contentDiv.appendChild(descP);

        if (imageUrl) {
            let imgEl = document.createElement('img');
            imgEl.className = 'step-image';
            imgEl.src = imageUrl;
            imgEl.alt = 'Step ' + number + ' image';
            contentDiv.appendChild(imgEl);
        }

        div.appendChild(numDiv);
        div.appendChild(contentDiv);
        stepsContainer.appendChild(div);
    }
}

// Populate scientific explanations for ingredients
function populateScience(ingredients) {
    let container = document.getElementById('science-container');
    if (!container) return;

    container.innerHTML = '';

    if (!ingredients || ingredients.length === 0) {
        container.textContent = 'No scientific details available for these ingredients';
        return;
    }

    let added = 0;
    for (let i = 0; i < ingredients.length; i++) {
        let ing = ingredients[i];
        if (!ing) continue;

        let desc = ing.scientificDescription || ing.scientific_description || ing.scientificDesc;
        if (desc && String(desc).trim() !== '') {
            let item = document.createElement('div');
            item.className = 'science-item';

            let h = document.createElement('h4');
            h.textContent = ing.name || ing.ingredient || 'Ingredient';

            let p = document.createElement('p');
            p.textContent = desc;

            item.appendChild(h);
            item.appendChild(p);
            container.appendChild(item);
            added++;
        }
    }

    if (added === 0) {
        container.textContent = 'No scientific details available for these ingredients';
    }
}

// Switch between different tabs on the page
function switchTab(tabName) {
    let allViews = document.querySelectorAll('.section-view');
    let allButtons = document.querySelectorAll('.tab-btn');
    let i;

    // Remove active class from all views
    for (i = 0; i < allViews.length; i++) {
        allViews[i].classList.remove('active');
    }

    // Remove active class from all buttons
    for (i = 0; i < allButtons.length; i++) {
        allButtons[i].classList.remove('active');
    }

    // Add active class to selected view and button
    let selectedView = document.getElementById('view-' + tabName);
    let selectedBtn = document.getElementById('btn-' + tabName);

    if (selectedView) {
        selectedView.classList.add('active');
    }
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Setup click and keyboard handlers for rating stars
function setupRatingStarsListener() {
    let stars = document.querySelectorAll('.rating-stars .star');
    let i;

    for (i = 0; i < stars.length; i++) {
        let star = stars[i];

        // Click event
        star.addEventListener('click', function() {
            currentRating = parseInt(this.dataset.value, 10);
            updateStarsDisplay();
            var showError = currentRating === 0;
            manageCommentMessage('rating-error-msg', '', showError);
        });

        // Keyboard event
        star.addEventListener('keydown', function(e) {
            let isEnter = e.key === 'Enter';
            let isSpace = e.key === ' ';
            
            if (isEnter || isSpace) {
                e.preventDefault();
                currentRating = parseInt(this.dataset.value, 10);
                updateStarsDisplay();
                var showError = currentRating === 0;
                manageCommentMessage('rating-error-msg', '', showError);
            }
        });
    }
    
    // Initialize stars display with Bootstrap icons
    updateStarsDisplay();
}

// Update comment form visibility when user already commented
function updateCommentFormForDuplicateCheck() {
    const commentForm = document.querySelector('.comment-form');
    
    if (!commentForm) return;
    
    if (userHasCommented) {
        // User already commented - disable form
        manageCommentMessage('duplicate-comment-msg', 'You have already commented on this recipe, delete the comment first to comment again.', true);
        commentForm.style.opacity = '0.5';
        commentForm.style.pointerEvents = 'none';
    } else {
        // User can comment
        manageCommentMessage('duplicate-comment-msg', '', false);
        commentForm.style.opacity = '1';
        commentForm.style.pointerEvents = 'auto';
    }
}

// Update visual display of rating stars based on currentRating
function updateStarsDisplay() {
    let stars = document.querySelectorAll('.rating-stars .star');
    let i;

    for (i = 0; i < stars.length; i++) {
        let star = stars[i];
        var index = i;

        if (index < currentRating) {
            star.innerHTML = '<i class="bi bi-star-fill"></i>';
            star.classList.add('active');
        } else {
            star.innerHTML = '<i class="bi bi-star"></i>';
            star.classList.remove('active');
        }
    }
}

// Delete comment from recipe (with modal confirmation)
async function deleteComment(recipeId, commentId) {
    // Store the IDs for the modal buttons
    window.pendingDelete = { recipeId, commentId };
    
    // Show the modal
    const modal = document.getElementById('delete-comment-modal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
}

// Confirm delete from modal
async function confirmDeleteComment() {
    const { recipeId, commentId } = window.pendingDelete;
    
    try {
        const response = await fetch(`/api/recipes/${recipeId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        // Remove from DOM
        const commentElements = document.querySelectorAll('.comment-card');
        commentElements.forEach(el => {
            if (el.getAttribute('data-comment-id') === commentId) {
                el.remove();
            }
        });

        // If user deleted their own comment, re-enable the form
        userHasCommented = false;
        updateCommentFormForDuplicateCheck();

        console.log('Comment deleted successfully');
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert(`Error deleting comment: ${error.message}`);
    } finally {
        // Hide the modal
        closeDeleteModal();
    }
}

// Cancel delete from modal
function cancelDeleteComment() {
    closeDeleteModal();
}

// Close the delete modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-comment-modal');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    window.pendingDelete = null;
}

// Render a single comment with user info and rating
function renderComment(comment) {
    // Create star display using Bootstrap icons
    let starsHtml = '';
    for (let j = 0; j < 5; j++) {
        if (j < (comment.rate || 0)) {
            starsHtml = starsHtml + '<i class="bi bi-star-fill"></i>';
        } else {
            starsHtml = starsHtml + '<i class="bi bi-star"></i>';
        }
    }

    let commentDiv = document.createElement('div');
    commentDiv.className = 'comment-card';
    commentDiv.setAttribute('data-comment-id', comment._id);

    // Check if current user is comment author
    let isOwner = sessionData.logged_in && sessionData.user_id === comment.user_id;
    let deleteBtn = '';
    
    if (isOwner) {
        let recipeId = getRecipeIdFromUrl();
        deleteBtn = '<button class="comment-delete-btn" onclick="deleteComment(\'" + recipeId + "\', \'" + comment._id + "\')" title="Delete comment"><i class="bi bi-trash"></i></button>';
    }

    let avatarSrc = comment.user_avatar;
    let userName = comment.user_name || 'User';
    let description = comment.description || '';

    commentDiv.innerHTML = '<div class="comment-header">' +
        '<img src="' + avatarSrc + '" class="avatar" alt="' + userName + '">' +
        '<div style="flex:1;">' +
        '<div class="comment-header-row">' +
        '<span class="comment-author">' + userName + '</span>' +
        deleteBtn +
        '</div>' +
        '<div class="comment-rating" style="color: #ffc107; font-size: 14px; margin: 4px 0;">' +
        starsHtml +
        '</div>' +
        '<div class="comment-text">' + description + '</div>' +
        '</div>' +
        '</div>';

    return commentDiv;
}

// Add a new comment to recipe with validation
async function addComment() {
    if (!sessionData.logged_in) {
        alert('Login to comment');
        return;
    }
    
    if (userHasCommented) {
        alert('You have already commented on this recipe, delete the comment first to comment again.');
        return;
    }

    const input = document.getElementById("userInput");
    const text = (input.value || '').trim();
    
    if (currentRating === 0) {
        manageCommentMessage('rating-error-msg', 'You need to add a star rating before commenting', true);
        return;
    }
    
    manageCommentMessage('rating-error-msg', '', false);

    const recipeId = getRecipeIdFromUrl();
    if (!recipeId) {
        console.error('No recipe ID found');
        return;
    }

    const sendBtn = document.getElementById("sendCommentBtn");
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
    }

    try {
        const payload = {
            description: text,
            rate: currentRating
        };

        const response = await fetch(`/api/recipes/${recipeId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success' && data.comment) {
            // Add the comment to the list at the top
            const list = document.getElementById("comment-list");
            const commentEl = renderComment(data.comment);
            list.insertBefore(commentEl, list.firstChild);

            // Mark that user has commented and disable form
            userHasCommented = true;
            updateCommentFormForDuplicateCheck();

            // Reset form
            input.value = '';
            currentRating = 0;
            updateStarsDisplay();
        } else {
            throw new Error('Response format error from server');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert(`Errore: ${error.message}`);
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Invia';
        }
    }
}

// Bookmark functionality
// Check if current recipe is bookmarked by the logged-in user
async function checkBookmarkStatus() {
    if (!sessionData.logged_in) {
        // User not logged in, set button to default state
        updateBookmarkButtonAppearance(false);
        return;
    }

    const recipeId = getRecipeIdFromUrl();
    if (!recipeId) {
        console.error('No recipe ID found');
        return;
    }

    try {
        // Fetch user's favorites list
        const response = await fetch('/api/user/favorites');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const favorites = await response.json();
        
        // Check if current recipe is in favorites
        const isBookmarked = favorites.some(recipe => recipe._id === recipeId);
        
        // Update button appearance
        updateBookmarkButtonAppearance(isBookmarked);
    } catch (error) {
        console.error('Error checking bookmark status:', error);
        // Default to not bookmarked on error
        updateBookmarkButtonAppearance(false);
    }
}

// Update bookmark button appearance based on bookmarked state
function updateBookmarkButtonAppearance(isBookmarked) {
    const bookmarkBtn = document.querySelector('.bookmark-btn');
    if (!bookmarkBtn) return;

    if (isBookmarked) {
        bookmarkBtn.innerHTML = '<i class="bi bi-heart-fill"></i>';
        bookmarkBtn.style.color = '#e74c3c';
    } else {
        bookmarkBtn.innerHTML = '<i class="bi bi-heart"></i>';
        bookmarkBtn.style.color = '#2c3e50';
    }
}

async function toggleBookmark() {
    // Check if user is logged in
    if (!sessionData.logged_in) {
        alert('You must be logged in to add or remove recipes from favorites');
        return;
    }

    const recipeId = getRecipeIdFromUrl();
    if (!recipeId) {
        console.error('No recipe ID found');
        return;
    }

    const bookmarkBtn = document.querySelector('.bookmark-btn');
    if (!bookmarkBtn) return;

    try {
        bookmarkBtn.disabled = true;

        const response = await fetch('/api/user/favorites/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipe_id: recipeId
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        // Update button appearance based on state
        updateBookmarkButtonAppearance(data.is_favorited);
        
        if (data.is_favorited) {
        } else {
        }

    } catch (error) {
        console.error('Error toggling bookmark:', error);
        alert(`Errore: ${error.message}`);
    } finally {
        bookmarkBtn.disabled = false;
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupRatingStarsListener();
    loadRecipe();

    // Setup bookmark button listener
    const bookmarkBtn = document.querySelector('.bookmark-btn');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', toggleBookmark);
    }

    // Setup delete comment modal listeners
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const modalClose = document.querySelector('#delete-comment-modal .modal-close');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelDeleteComment);
    }
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDeleteComment);
    }
    if (modalClose) {
        modalClose.addEventListener('click', closeDeleteModal);
    }
});