// Application state tracking
let currentStep = 1;
let recipeCoverImage = ''; // URL of recipe cover photo
let stepPhotos = {}; // Map of photos per cooking step: { stepIndex: photoUrl }

// DOM element references
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const stepIndicator = document.getElementById('stepIndicator');
// Header back button removed
const nextBtn = document.getElementById('nextBtn');
const actionContainer = document.getElementById('action-container');
const modal = document.getElementById('modal');
const confirmBtn = document.getElementById('confirmBtn');
const urlModal = document.getElementById('urlModal');
const coverPhotoUrl = document.getElementById('coverPhotoUrl');
const confirmUrlBtn = document.getElementById('confirmUrlBtn');
const cancelUrlBtn = document.getElementById('cancelUrlBtn');
const photoUpload = document.querySelector('.photo-upload');
const photoPlaceholder = document.querySelector('.photo-placeholder');
// Step Photo Modal elements
const stepPhotoModal = document.getElementById('stepPhotoModal');
const stepPhotoUrl = document.getElementById('stepPhotoUrl');
const confirmStepPhotoBtn = document.getElementById('confirmStepPhotoBtn');
const cancelStepPhotoBtn = document.getElementById('cancelStepPhotoBtn');
let currentStepPhotoIndex = null; // Track which step is being edited
// Error Modal elements
const errorModal = document.getElementById('errorModal');
const errorModalTitle = document.getElementById('errorModalTitle');
const errorModalMessage = document.getElementById('errorModalMessage');
const errorModalBtn = document.getElementById('errorModalBtn');

// Function to update step indicator
function updateStepIndicator(step) {
    const stepNumbers = stepIndicator.querySelectorAll('.step-number');
    stepNumbers.forEach((num, index) => {
        if (index + 1 <= step) {
            num.classList.add('active');
        } else {
            num.classList.remove('active');
        }
    });
}

// Function to show a specific step
function showStep(step) {
    // Hide all steps
    step1.classList.add('hidden');
    step2.classList.add('hidden');
    
    // Update step indicator
    updateStepIndicator(step);
    
    // Show the requested step
    if (step === 1) {
        step1.classList.remove('hidden');
        
        // Hide back button, show next button for step 1
        const backBtn = step1.querySelector('#backBtn');
        const nextBtn = step1.querySelector('#nextBtn');
        if (backBtn) backBtn.style.display = 'none';
        if (nextBtn) {
            nextBtn.style.display = 'flex';
            nextBtn.innerHTML = `
                Next Step
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            `;
        }
        
    } else if (step === 2) {
        step2.classList.remove('hidden');
        
        // Show back button, change next to "Publish Recipe" for step 2
        const backBtn = step2.querySelector('#backBtn');
        const nextBtn = step2.querySelector('#nextBtn');
        if (backBtn) backBtn.style.display = 'flex';
        if (nextBtn) {
            nextBtn.style.display = 'flex';
            nextBtn.innerHTML = `
                Publish Recipe
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            `;
        }
    }
    
    // Scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Function to collect recipe data from the form
function collectRecipeData() {
    const recipeData = {};
    
    // 1. Title
    recipeData.title = step1.querySelector('input[type="text"]').value.trim();
    
    // 2. Description
    recipeData.description = step1.querySelector('textarea').value.trim();
    
    // 3. Image (cover photo URL)
    recipeData.image = recipeCoverImage;
    
    // 4. Cooking duration (formato "XX min")
    const durationValue = document.getElementById('durationSlider').value;
    if (parseInt(durationValue) > 60) {
        recipeData.time = "> 60 min";
    } else {
        recipeData.time = durationValue + " min";
    }
    
    // 5. Difficulty (number 1-5)
    recipeData.difficulty = parseInt(document.getElementById('difficultySlider').value);
    
    // 6. Tags (categories)
    recipeData.tags = [...selectedCategories];
    
    // 7. Ingredients
    recipeData.ingredients = [];
    const ingredientRows = step2.querySelectorAll('.ingredient-row');
    ingredientRows.forEach(row => {
        const nameInput = row.querySelector('.ing-name-input');
        const qtyInput = row.querySelector('.ing-qty-input');
        
        const ingredient = {
            'ingredient-id': nameInput.getAttribute('data-id') || null,
            quantity: qtyInput.value.trim()
        };
        
        recipeData.ingredients.push(ingredient);
    });
    
    // 8. Preparation Steps
    recipeData.preparationSteps = [];
    const stepCards = step2.querySelectorAll('.step-card');
    stepCards.forEach((card, index) => {
        const textarea = card.querySelector('textarea');
        const stepObj = {
            description: textarea.value.trim(),
            image: stepPhotos[index] || null
        };
        recipeData.preparationSteps.push(stepObj);
    });
    
    return recipeData;
}

// Function to show error modal
function showErrorModal(title, message) {
    errorModalTitle.textContent = title;
    errorModalMessage.textContent = message;
    errorModal.classList.remove('hidden');
}

// Function to close error modal
function closeErrorModal() {
    errorModal.classList.add('hidden');
}

// Function to handle next button click
function handleNext() {
    if (currentStep === 1) {
        currentStep = 2;
        showStep(2);
    } else if (currentStep === 2) {
        // Store recipe data
        const recipeData = collectRecipeData();
        
        // Basic validation
        if (!recipeData.title) {
            showErrorModal('Recipe Name Required', 'Please enter a recipe name');
            return;
        }
        if (!recipeData.image) {
            showErrorModal('Cover Photo Required', 'Please add a cover photo');
            return;
        }
        if (recipeData.ingredients.length === 0) {
            showErrorModal('Ingredients Required', 'Please add at least one ingredient');
            return;
        }
        if (recipeData.preparationSteps.length === 0) {
            showErrorModal('Preparation Steps Required', 'Please add at least one preparation step');
            return;
        }
        
        // Publish recipe
        publishRecipe(recipeData);
    }
}

// Function to handle back button click
function handleBack() {
    if (currentStep === 2) {
        currentStep = 1;
        showStep(1);
    }
}

// Function to handle confirm button click in modal
function handleConfirm() {
    modal.classList.add('hidden');
    step2.classList.remove('blurred');
    actionContainer.classList.remove('blurred');
    document.body.style.overflow = 'auto';
    currentStep = 1;
    
    // Reset all states
    recipeCoverImage = '';
    stepPhotos = {};
    selectedCategories = [];
    
    // Reset form fields
    if(durationSlider) {
        durationSlider.value = 30;
        sliderValue.textContent = "30 min";
    }
    if(difficultySlider) {
        difficultySlider.value = 3;
        difficultyValue.textContent = "3 (Medium)";
    }
    
    // Reset cover photo display
    photoPlaceholder.style.backgroundImage = 'none';
    const iconBg = photoPlaceholder.querySelector('.icon-bg');
    const uploadText = photoPlaceholder.querySelector('.upload-text');
    const uploadSize = photoPlaceholder.querySelector('.upload-size');
    if (iconBg) iconBg.style.display = 'flex';
    if (uploadText) uploadText.style.display = 'block';
    if (uploadSize) uploadSize.style.display = 'block';
    
    // Reset recipe name and description
    step1.querySelector('input[type="text"]').value = '';
    step1.querySelector('textarea').value = '';
    
    // Reset ingredients
    const ingredientsList = document.getElementById('ingredientsList');
    ingredientsList.innerHTML = `
        <div class="ingredient-row">
            <button type="button" class="btn-delete" title="Remove ingredient">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
            <input type="text" class="ing-name-input" placeholder="Ingredient">
            <input type="text" class="ing-qty-input" placeholder="Quantity">
        </div>
    `;
    setupDeleteIngredient(ingredientsList.querySelector('.btn-delete'));
    setupIngredientAutocomplete(ingredientsList.querySelector('.ingredient-row'));
    
    // Reset steps
    const stepsList = document.getElementById('stepsList');
    stepsList.innerHTML = `
        <div class="step-card">
            <button type="button" class="btn-delete-step" title="Remove step">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
            
            <div class="step-card-header">
                <div class="step-number-badge">1</div>
                <textarea class="auto-grow" placeholder="Describe this step..." rows="2"></textarea>
            </div>
            
            <div class="step-card-footer">
                <button class="btn-photo-small">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                    Add Photo for Step 1
                </button>
            </div>
        </div>
    `;
    const firstStepDelBtn = stepsList.querySelector('.btn-delete-step');
    setupDeleteStep(firstStepDelBtn, 0);
    const firstStepPhotoBtn = stepsList.querySelector('.btn-photo-small');
    setupStepPhotoButton(firstStepPhotoBtn, 0);
    const firstStepTextarea = stepsList.querySelector('textarea');
    firstStepTextarea.addEventListener('input', autoResize);
    
    // Reset category tags
    renderCategoryTags();
    showStep(1);
}

// publish recipe to backend
async function publishRecipe(recipeData) {
    try {
        // Blur content while publishing
        step2.classList.add('blurred');
        actionContainer.classList.add('blurred');
        
        const response = await fetch('/api/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Show success modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error publishing recipe:', error);
        alert('Error publishing recipe. Please try again.');
        
        // Remove blur on error
        step2.classList.remove('blurred');
        actionContainer.classList.remove('blurred');
    }
}

// URL Modal Handlers
function openUrlModal() {
    coverPhotoUrl.value = '';
    urlModal.classList.remove('hidden');
    coverPhotoUrl.focus();
}

function closeUrlModal() {
    urlModal.classList.add('hidden');
    coverPhotoUrl.value = '';
}

function confirmCoverPhotoUrl() {
    const url = coverPhotoUrl.value.trim();
    if (!url) {
        alert('Please enter a valid image URL');
        return;
    }
    
    // Save the cover image URL
    recipeCoverImage = url;
    
    // Update the photo placeholder
    photoPlaceholder.style.backgroundImage = `url('${url}')`;
    photoPlaceholder.style.backgroundSize = 'cover';
    photoPlaceholder.style.backgroundPosition = 'center';
    
    // Hide placeholder elements
    const iconBg = photoPlaceholder.querySelector('.icon-bg');
    const uploadText = photoPlaceholder.querySelector('.upload-text');
    const uploadSize = photoPlaceholder.querySelector('.upload-size');
    
    if (iconBg) iconBg.style.display = 'none';
    if (uploadText) uploadText.style.display = 'none';
    if (uploadSize) uploadSize.style.display = 'none';
    
    closeUrlModal();
}

// Photo Upload click handler
if (photoUpload) {
    photoUpload.addEventListener('click', openUrlModal);
}

// URL Modal buttons
cancelUrlBtn.addEventListener('click', closeUrlModal);
confirmUrlBtn.addEventListener('click', confirmCoverPhotoUrl);

// Close modal when clicking outside
urlModal.addEventListener('click', (e) => {
    if (e.target === urlModal) {
        closeUrlModal();
    }
});

// Step photo modal handlers
function closeStepPhotoModal() {
    stepPhotoModal.classList.add('hidden');
    stepPhotoUrl.value = '';
    currentStepPhotoIndex = null;
}

function confirmStepPhotoUrl() {
    const url = stepPhotoUrl.value.trim();
    if (!url) {
        alert('Please enter a valid image URL');
        return;
    }
    
    if (currentStepPhotoIndex !== null) {
        stepPhotos[currentStepPhotoIndex] = url;
        
        // Update button color to show image has been uploaded
        const stepsList = document.getElementById('stepsList');
        const cards = stepsList.querySelectorAll('.step-card');
        if (cards[currentStepPhotoIndex]) {
            const photoBtn = cards[currentStepPhotoIndex].querySelector('.btn-photo-small');
            if (photoBtn) {
                photoBtn.style.color = '#1eb36a';
            }
        }
    }
    
    closeStepPhotoModal();
}

// Step Photo Modal buttons
cancelStepPhotoBtn.addEventListener('click', closeStepPhotoModal);
confirmStepPhotoBtn.addEventListener('click', confirmStepPhotoUrl);

// Close modal when clicking outside
stepPhotoModal.addEventListener('click', (e) => {
    if (e.target === stepPhotoModal) {
        closeStepPhotoModal();
    }
});

// Error Modal button
errorModalBtn.addEventListener('click', closeErrorModal);

// Close error modal when clicking outside
errorModal.addEventListener('click', (e) => {
    if (e.target === errorModal) {
        closeErrorModal();
    }
});

// Event listeners for navigation buttons
nextBtn.addEventListener('click', handleNext);
confirmBtn.addEventListener('click', handleConfirm);

// Close success modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        handleConfirm();
    }
});

// Manage Difficulty Slider
const difficultySlider = document.getElementById('difficultySlider');
const difficultyValue = document.getElementById('difficultyValue');

if (difficultySlider && difficultyValue) {
    const difficultyLabels = ['1 (Easy)', '2', '3 (Medium)', '4', '5 (Hard)'];
    difficultySlider.addEventListener('input', function() {
        const value = parseInt(this.value);
        difficultyValue.textContent = difficultyLabels[value - 1] || value;
    });
}

// Manage Category Tags
const categories = ["Healthy", "Vegan", "Vegetarian", "Snack", "Drink", "Dessert"];
const categoryTagsContainer = document.getElementById('categoryTagsContainer');
let selectedCategories = [];

function renderCategoryTags() {
    categoryTagsContainer.innerHTML = '';
    categories.forEach(category => {
        const tag = document.createElement('button');
        tag.type = 'button';
        tag.className = 'category-tag';
        tag.textContent = category;
        
        tag.addEventListener('click', () => {
            // Toggle active class
            tag.classList.toggle('active');
            
            // Update selected categories array
            if (tag.classList.contains('active')) {
                if (!selectedCategories.includes(category)) {
                    selectedCategories.push(category);
                }
            } else {
                selectedCategories = selectedCategories.filter(cat => cat !== category);
            }
        });
        
        categoryTagsContainer.appendChild(tag);
    });
}

// Render categories when page loads
renderCategoryTags();

// Manage Duration Slider
const durationSlider = document.getElementById('durationSlider');
const sliderValue = document.getElementById('sliderValue');

if (durationSlider && sliderValue) {
    durationSlider.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (value > 60) {
            sliderValue.textContent = "> 60 min";
        } else {
            sliderValue.textContent = value + " min";
        }
    });
}

// Autoresize textareas
function autoResize() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
}
document.querySelectorAll('.auto-grow').forEach(textarea => {
    textarea.addEventListener('input', autoResize);
});

// Manage Ingredients (Add and Remove)
const addIngredientBtn = document.getElementById('addIngredientBtn');
const ingredientsList = document.getElementById('ingredientsList');

function setupDeleteIngredient(btn) {
    btn.addEventListener('click', function() {
        const row = this.closest('.ingredient-row');
        if(row) row.remove();
    });
}

// Initialize delete on the first ingredient row
const firstIngDelBtn = document.querySelector('.ingredient-row .btn-delete');
if(firstIngDelBtn) setupDeleteIngredient(firstIngDelBtn);

if (addIngredientBtn && ingredientsList) {
    addIngredientBtn.addEventListener('click', () => {
        const newRow = document.createElement('div');
        newRow.className = 'ingredient-row';
        newRow.innerHTML = `
            <button type="button" class="btn-delete" title="Remove ingredient">
                <i class="bi bi-trash"></i>
            </button>
            <input type="text" class="ing-name-input" placeholder="Ingredient">
            <input type="text" class="ing-qty-input" placeholder="Quantity">
        `;
        ingredientsList.appendChild(newRow);
        
        const delBtn = newRow.querySelector('.btn-delete');
        setupDeleteIngredient(delBtn);
        // setup autocomplete for the new row
        setupIngredientAutocomplete(newRow);
    });
}

// Ingredient autocomplete
function setupIngredientAutocomplete(rowElement) {
    if (!rowElement) return;

    // find input
    const input = rowElement.querySelector('.ing-name-input');
    if (!input) return;

    // ensure wrapper for positioning
    let wrapper = input.closest('.ingredient-input-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'ingredient-input-wrapper';
        // replace input with wrapper > input
        input.parentNode.replaceChild(wrapper, input);
        wrapper.appendChild(input);
    }

    // helper to remove suggestions
    function removeSuggestions() {
        const existing = wrapper.querySelector('.suggestions-list');
        if (existing) existing.remove();
    }

    // debounce logic
    let debounceTimer = null;

    input.addEventListener('input', (e) => {
        const q = input.value.trim();
        removeSuggestions();
        if (debounceTimer) clearTimeout(debounceTimer);
        if (q.length <= 2) return;

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch('/api/ingredients/search?q=' + encodeURIComponent(q));
                if (!res.ok) return;
                const items = await res.json();
                if (!Array.isArray(items) || items.length === 0) return;

                // build suggestions list
                removeSuggestions();
                const list = document.createElement('div');
                list.className = 'suggestions-list';

                items.forEach(it => {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item';
                    item.textContent = it.name + (it.unit ? (' — ' + it.unit) : '');
                    item.dataset.id = it._id;
                    item.addEventListener('click', () => {
                        input.value = it.name;
                        input.setAttribute('data-id', it._id);
                        removeSuggestions();
                        input.focus();
                    });
                    list.appendChild(item);
                });

                wrapper.appendChild(list);
            } catch (err) {
                console.error('Autocomplete error', err);
            }
        }, 300);
    });

    // remove suggestions on outside click
    document.addEventListener('click', (ev) => {
        if (!wrapper.contains(ev.target)) removeSuggestions();
    });

    // ensure delete button still works if present in this row
    const delBtn = rowElement.querySelector('.btn-delete');
    if (delBtn) setupDeleteIngredient(delBtn);
}

// Initialize autocomplete for existing ingredient rows
document.querySelectorAll('.ingredient-row').forEach(row => setupIngredientAutocomplete(row));

// Global helper: remove all suggestion lists on the page
function removeAllSuggestionLists() {
    document.querySelectorAll('.suggestions-list').forEach(el => el.remove());
}

// Close suggestions when clicking outside any ingredient input or suggestion list
document.addEventListener('click', (e) => {
    if (!e.target.closest('.ingredient-input-wrapper') && !e.target.closest('.suggestions-list')) {
        removeAllSuggestionLists();
    }
});

// manage steps (add and remove)
const addStepBtn = document.getElementById('addStepBtn');
const stepsList = document.getElementById('stepsList');

// Step Photo Handler
function setupStepPhotoButton(btn, stepIndex) {
    btn.addEventListener('click', () => {
        currentStepPhotoIndex = stepIndex;
        stepPhotoUrl.value = stepPhotos[stepIndex] || '';
        stepPhotoModal.classList.remove('hidden');
        stepPhotoUrl.focus();
    });
}

function renumberSteps() {
    const cards = stepsList.querySelectorAll('.step-card');
    cards.forEach((card, index) => {
        const num = index + 1;
        // Update badge
        const badge = card.querySelector('.step-number-badge');
        if(badge) badge.textContent = num;
        
        // Update photo button text
        const photoBtn = card.querySelector('.btn-photo-small');
        if(photoBtn) {
            photoBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
                Add Photo for Step ${num}
            `;
        }
    });
}

function setupDeleteStep(btn, stepIndex) {
    btn.addEventListener('click', function() {
        const card = this.closest('.step-card');
        if(card) {
            // Remove associated photo
            delete stepPhotos[stepIndex];
            card.remove();
            renumberSteps();
        }
    });
}

// Inizialization delete on the first step
const firstStepDelBtn = document.querySelector('.step-card .btn-delete-step');
if(firstStepDelBtn) setupDeleteStep(firstStepDelBtn, 0);

// Inizialization photo button on the first step
const firstStepPhotoBtn = document.querySelector('.step-card .btn-photo-small');
if(firstStepPhotoBtn) setupStepPhotoButton(firstStepPhotoBtn, 0);

if (addStepBtn && stepsList) {
    addStepBtn.addEventListener('click', () => {
        const currentSteps = stepsList.querySelectorAll('.step-card');
        const nextStepNum = currentSteps.length + 1;
        const nextStepIndex = currentSteps.length;

        const newStep = document.createElement('div');
        newStep.className = 'step-card';
        newStep.innerHTML = `
            <button type="button" class="btn-delete-step" title="Remove step">
                <i class="bi bi-trash"></i>
            </button>
            
            <div class="step-card-header">
                <div class="step-number-badge">${nextStepNum}</div>
                <textarea class="auto-grow" placeholder="Describe this step..." rows="2"></textarea>
            </div>
            
            <div class="step-card-footer">
                <button class="btn-photo-small">
                    <i class="bi bi-camera"></i>
                    Add Photo for Step ${nextStepNum}
                </button>
            </div>
        `;
        
        stepsList.appendChild(newStep);

        const newTextarea = newStep.querySelector('.auto-grow');
        newTextarea.addEventListener('input', autoResize);
        
        const delBtn = newStep.querySelector('.btn-delete-step');
        setupDeleteStep(delBtn, nextStepIndex);
        
        const photoBtn = newStep.querySelector('.btn-photo-small');
        setupStepPhotoButton(photoBtn, nextStepIndex);
    });
}

// Inizialization: show first step
showStep(1);

// Attach event listeners to step navigation buttons
const nextBtnStep1 = step1.querySelector('#nextBtn');
const nextBtnStep2 = step2.querySelector('#nextBtn');
const backBtnStep2 = step2.querySelector('#backBtn');

if (nextBtnStep1) {
    nextBtnStep1.addEventListener('click', handleNext);
}

if (nextBtnStep2) {
    nextBtnStep2.addEventListener('click', handleNext);
}

if (backBtnStep2) {
    backBtnStep2.addEventListener('click', handleBack);
}