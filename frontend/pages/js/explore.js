const activeFilters = {
    maxTime: null,  // null or number in minutes
    category: 'All', // default category
    chefId: null  // null or chef_id (hidden filter for logged-in chefs)
};

// Temporary state for modal changes (before clicking Done)
let tempFilters = {
    maxTime: activeFilters.maxTime,
    category: activeFilters.category
};

// Current search results (raw data from API)
let currentSearchResults = [];

// User role for recipe card visibility
let userRole = null;

// Logged-in user's ID (chef only)
let loggedInUserId = null;

// Get user role from session API
async function getUserRole() {
    try {
        const response = await fetch('/api/session');
        if (response.ok) {
            const session = await response.json();
            userRole = session.role || null;
            loggedInUserId = session.user_id || null;
            
            console.log('User role fetched:', userRole);
            console.log('User ID fetched:', loggedInUserId);
            
            // If logged in as chef, apply hidden chef_id filter
            if (userRole === 'chef' && loggedInUserId) {
                activeFilters.chefId = loggedInUserId;
                console.log('Hidden chef filter applied:', activeFilters.chefId);
            }
            return userRole;
        }
    } catch (error) {
        console.error('Error fetching user role:', error);
    }
    return null;
}

// slider color update
function updateSliderColor(slider) {
    if (!slider) return;
    // Calculate percentage
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, #1eb36a 0%, #1eb36a ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
}

function toggleModal() {
    const modal = document.getElementById("filterModal");
    const isOpen = modal.classList.toggle("open");
    
    // When opening modal, sync temporary filters with active filters
    if (isOpen) {
        tempFilters.maxTime = activeFilters.maxTime;
        tempFilters.category = activeFilters.category;
        syncModalUI();
    }
}

// Sync modal UI to reflect temporary filter state
function syncModalUI() {
    // Update slider position and label
    const slider = document.getElementById("timeRange");
    if (slider && tempFilters.maxTime !== null) {
        slider.value = tempFilters.maxTime;
        updateSliderColor(slider);
    }
    
    // Update category pill UI
    const categoryBtns = document.querySelectorAll('.pill-item button');
    categoryBtns.forEach(btn => {
        const pillItem = btn.closest('.pill-item');
        const category = pillItem?.querySelector('.category-label')?.textContent.trim();
        if (category === tempFilters.category) {
        btn.classList.add('active');
        } else {
        btn.classList.remove('active');
        }
    });
}

// Parse time string to number ("30 min" to 30, "1 hour" to 60)
function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    
    const timeStr_lower = timeStr.toLowerCase().trim();
    
    // Try to extract number and unit
    const match = timeStr_lower.match(/(\d+)\s*(h|hour|hr|m|min|minute)/);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    if (unit.includes('h')) {
        return value * 60; // Convert hours to minutes
    } else {
        return value; // Already in minutes
    }
}

// Apply filters to currentSearchResults and render
function applyFilters() {
    console.log('Applying filters:', activeFilters);
    
    const grid = document.getElementById('recipes-grid');
    if (!grid) {
        console.error('Grid not found');
        return;
    }
    
    // Start with current search results
    let filteredRecipes = [...currentSearchResults];
    
    // Filter by chef_id (hidden filter for logged-in chefs)
    if (activeFilters.chefId !== null) {
        filteredRecipes = filteredRecipes.filter(recipe => {
        return recipe.chef_id === activeFilters.chefId;
        });
        console.log(`After chef filter: ${filteredRecipes.length} recipes`);
    }
    
    // Filter by maxTime
    if (activeFilters.maxTime !== null) {
        filteredRecipes = filteredRecipes.filter(recipe => {
        const recipeTime = parseTimeToMinutes(recipe.time || recipe.cooking_time || recipe.duration || '');
        if (recipeTime === null) return true; // Include if we can't parse
        return recipeTime <= activeFilters.maxTime;
        });
        console.log(`After time filter: ${filteredRecipes.length} recipes`);
    }
    
    // Filter by category
    if (activeFilters.category !== 'All') {
        filteredRecipes = filteredRecipes.filter(recipe => {
        const tags = recipe.tags || [];
        return tags.some(tag => 
            tag.toLowerCase() === activeFilters.category.toLowerCase()
        );
        });
        console.log(`After category filter: ${filteredRecipes.length} recipes`);
    }
    
    // Clear grid
    grid.innerHTML = '';
    
    // Show message if no results
    if (filteredRecipes.length === 0) {
        grid.innerHTML = '<div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">Nessun risultato con questi filtri</div>';
        return;
    }
    
    // Render filtered recipes using RecipeCard module
    const frag = document.createDocumentFragment();
    filteredRecipes.forEach(recipe => {
        try {
        const card = RecipeCard.createCardElement(recipe, userRole);
        frag.appendChild(card);
        } catch (error) {
        console.error('Error creating card:', error);
        }
    });
    grid.appendChild(frag);
    
    console.log(`Rendered ${filteredRecipes.length} recipes`);
}

// Update slider label with formatted time
function updateSliderLabel(slider) {
    const sliderValue = document.getElementById("sliderValue");
    if (!sliderValue) return;
    
    const value = parseInt(slider.value);
    let label = '';
    
    if (value > 60) {
        label = '> 60 min';
    } else if (value === 1) {
        label = '1 min';
    } else {
        label = value + ' min';
    }
    
    sliderValue.textContent = label;
}

// Initialize slider styling on page load and setup event listeners
window.addEventListener("DOMContentLoaded", async () => {
    // Get user role
    await getUserRole();

    const slider = document.getElementById("timeRange");
    const categoryBtns = document.querySelectorAll('.pill-item button');
    const doneBtnModal = document.querySelector('.btn-done');
    const cancelBtnModal = document.querySelector('.btn-cancel');
    const filterModal = document.getElementById("filterModal");

    // Update slider color and label on load
    updateSliderColor(slider);
    updateSliderLabel(slider);

    // Slider event listener
    if (slider) {
        slider.addEventListener('input', (e) => {
        updateSliderLabel(e.target);
        updateSliderColor(e.target);
        // Update temporary filter state
        tempFilters.maxTime = parseInt(e.target.value);
        console.log('Slider changed:', tempFilters.maxTime);
        });
    }

    // Categoru pill buttons event listeners
    if (categoryBtns.length > 0) {
        categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Update temporary filter state, extract from category-label
            const categoryItem = btn.closest('.pill-item');
            const category = categoryItem?.querySelector('.category-label')?.textContent.trim();
            tempFilters.category = category || 'All';
            console.log('Category selected:', tempFilters.category);
        });
        });
    }

    // Done button that save and apply filters
    if (doneBtnModal) {
        doneBtnModal.addEventListener('click', () => {
        // Save temporary filters to active filters
        activeFilters.maxTime = tempFilters.maxTime;
        activeFilters.category = tempFilters.category;
        console.log('Filters saved:', activeFilters);
        
        // Close modal
        filterModal.classList.remove('open');
        
        // Apply filters to grid
        applyFilters();
        });
    }

    // Cancel button that discard changes
    if (cancelBtnModal) {
        cancelBtnModal.addEventListener('click', () => {
        // Reset temporary filters to last saved active filters
        tempFilters.maxTime = activeFilters.maxTime;
        tempFilters.category = activeFilters.category;
        console.log('Filters cancelled, reverted to:', activeFilters);
        
        // Close modal
        filterModal.classList.remove('open');
        });
    }

    // Close modal when clicking outside
    if (filterModal) {
        filterModal.addEventListener('click', (e) => {
        // Only close if clicking on the overlay, not the modal content
        if (e.target === filterModal) {
            tempFilters.maxTime = activeFilters.maxTime;
            tempFilters.category = activeFilters.category;
            filterModal.classList.remove('open');
        }
        });
    }
});

// Simple debounce helper
function debounce(fn, wait) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Setup search input listener to fetch /api/search and render into recipes-grid
window.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector('.search-input');
    const grid = document.getElementById('recipes-grid');
    if (!input || !grid) return;

    // small helper to prevent XSS when injecting the search term
    function escapeHtml(unsafe) {
        return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const doSearch = async () => {
        const q = input.value.trim();
        // clear grid immediately
        grid.innerHTML = '';
        if (!q) return; // API returns [] for empty query

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!Array.isArray(data)) return;

            // Save results to global variable
            currentSearchResults = data;
            console.log(`Search returned ${data.length} results`);

            // If no results, show a friendly message
            if (data.length === 0) {
                const escaped = escapeHtml(q);
                grid.innerHTML = `<div class="no-results">No results for "${escaped}"</div>`;
                return;
            }

            // Apply filters to render the data
            applyFilters();
        } catch (e) {
        console.error('Search error', e);
        }
    };

    const debouncedSearch = debounce(doSearch, 300);
    input.addEventListener('input', debouncedSearch);
});