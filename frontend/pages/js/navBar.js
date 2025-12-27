// Load navbar
async function loadNavbar() {
    try {
        const response = await fetch('/pages/html/navBar.html');
        if (!response.ok) {
            console.error('Failed to load navbar:', response.status);
            return;
        }
        
        const navbarHTML = await response.text();
        const navContainer = document.getElementById('navbar-container');
        
        if (navContainer) {
            navContainer.innerHTML = navbarHTML;
            updateNavbarForSession();
        }
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

// Update navbar based on role
async function updateNavbarForSession() {
    try {
        const response = await fetch('/api/session');
        if (!response.ok) {
            console.error('Session API error:', response.status);
            return;
        }
        
        const session = await response.json();
        const isLoggedIn = session.logged_in;
        const isChef = session.role === 'chef';

        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userSessionInfo = document.getElementById('user-session-info');
        
        if (isLoggedIn) {
            if (loginBtn)
                loginBtn.style.display = 'none';
            if (registerBtn)
                registerBtn.style.display = 'none';
            if (userSessionInfo)
                userSessionInfo.style.display = 'flex';
            
            const userWelcome = document.getElementById('user-welcome');
            if (userWelcome)
                userWelcome.textContent = 'Welcome, ' + session.user_name;
        } else {
            if (loginBtn)
                loginBtn.style.display = 'block';
            if (registerBtn)
                registerBtn.style.display = 'block';
            if (userSessionInfo)
                userSessionInfo.style.display = 'none';
        }

        const chefLinks = document.querySelectorAll('.chef-link');
        const homeBtn = document.getElementById('home-btn');
        const profileBtn = document.getElementById('profile-btn');
        
        if (isChef && isLoggedIn) {
            chefLinks.forEach(function(link) {
                link.style.display = 'flex';
            });
            if (homeBtn) homeBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'none';
        } else {
            chefLinks.forEach(function(link) {
                link.style.display = 'none';
            });
            if (homeBtn) homeBtn.style.display = 'block';
            if (profileBtn) profileBtn.style.display = 'block';
        }

        setActiveNavLink();

    } catch (error) {
        console.error('Session check failed:', error);
        setActiveNavLink();
    }
}

// Set active link based on current page
function setActiveNavLink() {
    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-btn');
    
    navLinks.forEach(function(link) {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', loadNavbar);