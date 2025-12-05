// ===========================
// FETCH AND RENDER RECIPES
// ===========================
async function loadRecipes() {
    try {
        const response = await fetch('/api/recipes');
        const recipes = await response.json();
        
        const grid = document.getElementById('recipesGrid');
        grid.innerHTML = '';
        
        recipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading recipes:', error);
        document.getElementById('recipesGrid').innerHTML = '<p>Error loading recipes</p>';
    }
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    card.innerHTML = `
        <div class="recipe-header">
            <img src="${recipe.user_avatar || 'https://via.placeholder.com/40'}" alt="${recipe.user_name}" class="user-avatar">
            <span class="user-name">${recipe.user_name || 'Unknown'}</span>
        </div>
        <div class="recipe-image">
            <img src="${recipe.image_url || 'https://via.placeholder.com/200'}" alt="${recipe.title}">
        </div>
        <div class="recipe-footer">
            <div class="recipe-title-rating">
                <h4>${recipe.title}</h4>
                <div class="bookmark-btn">
                    <i class="bi bi-star-fill"></i>
                    <span class="star-value">${recipe.rating || '0'}</span>
                </div>
            </div>
            <div class="recipe-meta">
                <div class="difficulty">
                    ${createDifficultyStars(recipe.difficulty)}
                </div>
                <div class="time">
                    <i class="bi bi-clock"></i>
                    <span>${recipe.time || '0'} min</span>
                </div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        window.location.href = `/recipe/${recipe._id}`;
    });
    
    return card;
}

function createDifficultyStars(difficulty) {
    const level = difficulty || 1;
    let stars = '';
    for (let i = 0; i < level; i++) {
        stars += '<svg width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M8 0L10 5H15L11 8L13 13L8 10L3 13L5 8L1 5H6L8 0Z" fill="#1eb36a"/></svg>';
    }
    return stars;
}

// ===========================
// CATEGORY FILTER
// ===========================
const categoryPillButtons = document.querySelectorAll('.category-pill');

categoryPillButtons.forEach(pill => {
    pill.addEventListener('click', () => {
        categoryPillButtons.forEach(p => {
            p.classList.remove('active');
            const label = p.closest('.category-item').querySelector('.category-label');
            label.classList.remove('active');
        });
        pill.classList.add('active');
        const label = pill.closest('.category-item').querySelector('.category-label');
        label.classList.add('active');
        
        const category = label.textContent.trim();
        console.log('Selected category:', category);
    });
});

// ===========================
// TAB SWITCHING
// ===========================
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        console.log('Active tab:', button.textContent);
    });
});

// ===========================
// SCROLL BUTTONS FOR CATEGORIES
// ===========================
const scrollLeftBtn = document.getElementById('scrollLeft');
const scrollRightBtn = document.getElementById('scrollRight');
const categoryPills = document.getElementById('categoryPills');

if (scrollLeftBtn && scrollRightBtn && categoryPills) {
    scrollLeftBtn.addEventListener('click', () => {
        categoryPills.scrollBy({ left: -150, behavior: 'smooth' });
    });

    scrollRightBtn.addEventListener('click', () => {
        categoryPills.scrollBy({ left: 150, behavior: 'smooth' });
    });

    // Drag scroll functionality
    let isDown = false;
    let startX;
    let scrollLeft;

    categoryPills.addEventListener('mousedown', (e) => {
        isDown = true;
        categoryPills.style.cursor = 'grabbing';
        startX = e.pageX - categoryPills.offsetLeft;
        scrollLeft = categoryPills.scrollLeft;
    });

    categoryPills.addEventListener('mouseleave', () => {
        isDown = false;
        categoryPills.style.cursor = 'grab';
    });

    categoryPills.addEventListener('mouseup', () => {
        isDown = false;
        categoryPills.style.cursor = 'grab';
    });

    categoryPills.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - categoryPills.offsetLeft;
        const walk = (x - startX);
        categoryPills.scrollLeft = scrollLeft - walk;
    });

    // Touch support for mobile
    categoryPills.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - categoryPills.offsetLeft;
        scrollLeft = categoryPills.scrollLeft;
    }, { passive: true });

    categoryPills.addEventListener('touchend', () => {
        isDown = false;
    }, { passive: true });

    categoryPills.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - categoryPills.offsetLeft;
        const walk = (x - startX);
        categoryPills.scrollLeft = scrollLeft - walk;
    }, { passive: true });
}

// ===========================
// INIT ON DOM LOAD
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    loadRecipes();
});