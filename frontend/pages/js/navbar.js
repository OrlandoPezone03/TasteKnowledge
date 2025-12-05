// ===========================
// LOAD NAVBAR FROM navBar.html
// ===========================
async function loadNavbar() {
    try {
        const response = await fetch('../html/navBar.html');
        if (response.ok) {
            const navbarHTML = await response.text();
            // Inserisci la navbar nel container
            const navContainer = document.getElementById('navbar-container');
            if (navContainer) {
                navContainer.innerHTML = navbarHTML;
                // Dopo aver caricato la navbar, imposta il pulsante attivo
                setActiveNavButton();
            }
        } else {
            console.error('Failed to load navbar:', response.status);
        }
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// ===========================
// SET ACTIVE NAV BUTTON
// ===========================
function setActiveNavButton() {
    const currentPage = window.location.pathname;
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.classList.remove('active');
        const href = button.getAttribute('href');
        
        // Controlla se l'href corrisponde alla pagina corrente
        if (currentPage.includes('home.html') && href.includes('home.html')) {
            button.classList.add('active');
        } else if (currentPage.includes('explore.html') && href.includes('explore.html')) {
            button.classList.add('active');
        } else if (currentPage.includes('profile.html') && href.includes('profile.html')) {
            button.classList.add('active');
        }
    });
}

// ===========================
// INIT ON DOM LOAD
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    loadNavbar();
});