// notification system
function showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(container);
    }

    // create the notification
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#1eb36a' : type === 'error' ? '#e74c3c' : '#3498db';
    const iconClass = type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-x-circle' : 'bi-info-circle';

    notification.innerHTML = `
    <div style="background: ${bgColor}; color: white; padding: 14px 18px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 10px; margin-bottom: 10px; max-width: 350px; word-break: break-word;">
      <i class="bi ${iconClass}" style="font-size: 16px;"></i>
      <span style="font-size: 14px;">${message}</span>
    </div>
  `;

    container.appendChild(notification);

    // auto remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// load and display favorites
async function loadFavorites(userRole) {
    try {
        const response = await fetch('/api/user/favorites');

        if (!response.ok) {
            return;
        }

        const recipes = await response.json();

        const favoritesGrid = document.querySelector('.favorites-grid');

        if (!favoritesGrid) {
            return;
        }

        // clear the grid
        favoritesGrid.innerHTML = '';

        // if no favorites, show message
        if (!recipes || recipes.length === 0) {
            favoritesGrid.innerHTML = '<p class="empty-msg">You have no favorites yet.</p>';
            return;
        }

        // create and append cards for each recipe
        recipes.forEach((recipe) => {
            const card = createCardElement(recipe, userRole);
            if (card) {
                favoritesGrid.appendChild(card);
            }
        });
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const modal = document.getElementById("settings-modal");
    const openBtn = document.getElementById("settings-btn");
    const backBtn = document.getElementById("modal-back-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const saveProfileBtn = document.getElementById("save-profile-btn");
    const usernameInput = document.getElementById("username-input");
    const avatarInput = document.getElementById("avatar-input");

    // store current session data for profile form
    let currentSession = null;

    if (openBtn) {
        openBtn.onclick = async () => {
            modal.classList.remove("hidden");
            // preload profile data when opening modal if user is logged in
            if (currentSession && currentSession.logged_in) {
                usernameInput.value = currentSession.user_name || "";
                avatarInput.value = currentSession.user_avatar || "";
            }
        };
    }
    if (backBtn) backBtn.onclick = () => modal.classList.add("hidden");

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    });

    // save profile function
    if (saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            if (!currentSession || !currentSession.logged_in) {
                showNotification("Login to update profile", "error");
                return;
            }

            const newUsername = (usernameInput.value || "").trim();
            const newAvatar = (avatarInput.value || "").trim();

            if (!newUsername) {
                showNotification("Username can not be empty", "error");
                return;
            }

            // disable button during save
            saveProfileBtn.disabled = true;
            const originalText = saveProfileBtn.textContent;
            saveProfileBtn.textContent = "Saving...";

            try {
                const response = await fetch("/api/update_profile", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_name: newUsername,
                        user_avatar: newAvatar
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // update local session data
                    currentSession.user_name = newUsername;
                    currentSession.user_avatar = newAvatar;
                    // update profile display
                    document.getElementById("profile-name").textContent = newUsername;
                    const avatar = document.getElementById("profile-avatar");
                    if (newAvatar) {
                        avatar.src = newAvatar;
                    }
                    // show success feedback
                    showNotification("Profile updated successfully!", "success");
                    // close modal
                    modal.classList.add("hidden");
                } else {
                    showNotification("Error: " + (data.error || "Could not update profile"), "error");
                }
            } catch (error) {
                console.error("Error during profile update:", error);
                showNotification("Error during profile update", "error");
            } finally {
                // re-enable button
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = originalText;
            }
        };
    }

    // logout function
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            try {
                // Call the logout api
                const response = await fetch("/api/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    // Clear localStorage to prevent state inconsistency
                    localStorage.clear();
                    // Redirect to home after logout
                    window.location.href = "/";
                } else {
                    console.error("Logout failed");
                }
            } catch (error) {
                console.error("Error during logout:", error);
            }
        };
    }

    // fetch session / profile data
    const res = await fetch("/api/session");
    if (!res.ok) {
        console.error('Error fetching session');
        return;
    }

    const session = await res.json();
    currentSession = session;  // store for later use in profile update

    if (!session.logged_in) {
        return;
    }

    // inject profile data
    document.getElementById("profile-name").textContent =
        session.user_name || "User";

    const avatar = document.getElementById("profile-avatar");
    avatar.src = session.user_avatar;

    // update followed chefs count
    const followedChefCount = session.followed_chefs_count || 0;
    const statsCountElement = document.querySelector('.stats-count');
    if (statsCountElement) {
        statsCountElement.textContent = followedChefCount;
    }

    // load and display favorites
    await loadFavorites(session.role);
});