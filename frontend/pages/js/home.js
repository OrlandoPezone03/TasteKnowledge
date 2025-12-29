// state variables
let userRole = null;
let allRecipes = [];

// retrieve user role from session
async function getUserRole() {
    try {
        const response = await fetch('/api/session');
        if (response.ok) {
            const session = await response.json();
            userRole = session.role || null;
            return userRole;
        }
    } catch (error) {
        return null;
    }
    return null;
}

// render recipes in grid
function renderRecipes(recipesToRender) {
    const grid = document.getElementById('recipesGrid');
    if (!grid) {
        return;
    }
    
    grid.innerHTML = '';
    
    if (!recipesToRender || recipesToRender.length === 0) {
        const activeTab = document.querySelector('.tab-btn.active');
        const isFollowedTab = activeTab && activeTab.textContent.includes('Followed');
        
        let emptyMessage = '';
        if (isFollowedTab) {
            emptyMessage = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No recipes from followed chefs yet.</p>';
        } else {
            emptyMessage = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No recipes found</p>';
        }
        
        grid.innerHTML = emptyMessage;
        return;
    }
    
    recipesToRender.forEach((recipe) => {
        try {
            const card = RecipeCard.createCardElement(recipe, userRole);
            grid.appendChild(card);
        } catch (error) {
            return;
        }
    });
}

// load recipes from api
async function loadRecipes(apiUrl = '/api/recipes') {
    if (typeof apiUrl !== 'string' || !apiUrl.startsWith('/api/')) {
        apiUrl = '/api/recipes';
    }
    
    const grid = document.getElementById('recipesGrid');
    if (grid) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">loading recipes...</p>';
    }
    
    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        allRecipes = (await response.json()) || [];
        
        renderRecipes(allRecipes);
    } catch (error) {
        if (grid) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">error loading recipes</p>';
        }
    }
}

// initialization on dom load
document.addEventListener('DOMContentLoaded', async () => {
    await getUserRole();
    
    await loadRecipes();

    // category filter handling
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        const button = pill.querySelector('button');
        button.addEventListener('click', () => {
            filterPills.forEach(p => {
                p.classList.remove('active');
                p.querySelector('button').classList.remove('active');
            });
            pill.classList.add('active');
            button.classList.add('active');
            
            const category = pill.querySelector('span').textContent.trim();
            let recipesToDisplay = category === 'All' 
                ? allRecipes 
                : allRecipes.filter(recipe => {
                    const tags = recipe.tags || [];
                    return tags.some(tag => tag.toLowerCase() === category.toLowerCase());
                });
            
            renderRecipes(recipesToDisplay);
        });
    });

    // tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabArray = Array.from(tabButtons);
    
    if (tabArray.length > 0) {
        tabArray[0].addEventListener('click', () => {
            tabArray.forEach(btn => btn.classList.remove('active'));
            tabArray[0].classList.add('active');
            loadRecipes('/api/recipes');
        });
    }
    
    if (tabArray.length > 1) {
        tabArray[1].addEventListener('click', async () => {
            if (!userRole) {
                tabArray.forEach(btn => btn.classList.remove('active'));
                tabArray[1].classList.add('active');
                const grid = document.getElementById('recipesGrid');
                if (grid) {
                    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">log in to view recipes from chefs you follow</p>';
                }
                return;
            }
            
            tabArray.forEach(btn => btn.classList.remove('active'));
            tabArray[1].classList.add('active');
            await loadRecipes('/api/recipes/followed');
        });
    }

    // scroll controls for category pills
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
    }
});