// notification system
function showNotification(message, type = 'info') {
    // create notification container if it doesn't exist
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

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener("DOMContentLoaded", async () => {
    // get url parameters
    const urlParams = new URLSearchParams(window.location.search);
    const chefIdParam = urlParams.get("id");

    // elements
    const settingsBtn = document.getElementById("settings-btn");
    const followBtn = document.getElementById("follow-btn");
    const modal = document.getElementById("settings-modal");
    const backBtn = document.getElementById("modal-back-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const saveProfileBtn = document.getElementById("save-profile-btn");
    const usernameInput = document.getElementById("username-input");
    const avatarInput = document.getElementById("avatar-input");

    // store current session data for profile form
    let currentSession = null;

    // store chef data to populate info tab (used by both external and own profile)
    let chefDataToUse = null;

    // if chef id provided: load external chef profile
    if (chefIdParam) {
        try {
            // fetch chef data from api with include_recipes=true
            const res = await fetch(`/api/chefs/${chefIdParam}?include_recipes=true`);

            if (!res.ok) {
                console.error("Chef not found");
                return (window.location.href = "/login");
            }

            const chefData = await res.json();

            // store for later use in info tab population
            chefDataToUse = chefData;

            // populate profile data
            document.getElementById("profile-name").textContent =
                chefData.user_name || "Unknown Chef";

            const avatar = document.getElementById("profile-avatar");
            avatar.src = chefData.user_avatar;

            // populate recipes in the recipes view
            const recipesGrid = document.querySelector(".recipes-grid");

            if (recipesGrid && chefData.recipes) {
                if (Array.isArray(chefData.recipes) && chefData.recipes.length > 0) {
                    // render recipes using createcardelement
                    chefData.recipes.forEach((recipe) => {
                        const cardElement = createCardElement(recipe, null); // null = not a chef user (viewing profile)
                        recipesGrid.appendChild(cardElement);
                    });
                } else {
                    // show message if no recipes
                    recipesGrid.innerHTML =
                        '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999; font-size: 16px;">' +
                        '<p><i class="bi bi-book"></i></p>' +
                        '<p>No published recipes</p>' +
                        '</div>';
                }
            }

            // handle buttons
            if (chefData.is_me === false) {
                // hide settings button, show follow button
                settingsBtn.style.display = "none";
                followBtn.style.display = "block";

                // set follow button state
                if (chefData.is_followed) {
                    followBtn.textContent = "Following";
                    followBtn.classList.remove("follow");
                    followBtn.classList.add("following");
                } else {
                    followBtn.textContent = "Follow";
                    followBtn.classList.add("follow");
                    followBtn.classList.remove("following");
                }

                // add click listener to follow button
                followBtn.onclick = async () => {
                    try {
                        // call follow/unfollow api
                        const followRes = await fetch(`/api/chefs/${chefIdParam}/follow`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });

                        if (!followRes.ok) {
                            console.error("Error toggling follow status");
                            return;
                        }

                        const followData = await followRes.json();
                        const isFollowed = followData.is_followed;

                        // update button state
                        if (isFollowed) {
                            followBtn.textContent = "Following";
                            followBtn.classList.remove("follow");
                            followBtn.classList.add("following");
                        } else {
                            followBtn.textContent = "Follow";
                            followBtn.classList.add("follow");
                            followBtn.classList.remove("following");
                        }
                    } catch (error) {
                        console.error("Error in follow button click:", error);
                    }
                };
            } else {
                // this is the user's own profile
                settingsBtn.style.display = "block";
                followBtn.style.display = "none";

                // setup settings modal
                backBtn.onclick = () => modal.classList.add("hidden");
                modal.addEventListener("click", (e) => {
                    if (e.target === modal) modal.classList.add("hidden");
                });
            }
        } catch (error) {
            console.error("Error loading chef profile:", error);
            window.location.href = "/login";
        }
    } else {
        try {
            const res = await fetch("/api/session");
            if (!res.ok) return (window.location.href = "/login");

            const session = await res.json();
            if (!session.logged_in) return (window.location.href = "/login");

            // inject profile data
            document.getElementById("profile-name").textContent =
                session.user_name || "User";

            const avatar = document.getElementById("profile-avatar");
            avatar.src = session.user_avatar;

            // show settings button, hide follow button
            settingsBtn.style.display = "block";
            followBtn.style.display = "none";

            // store session for profile update
            currentSession = session;

            // fetch chef data
            let chefDataForInfo = null;
            const recipesGrid = document.querySelector(".recipes-grid");
            if (session.user_id) {
                try {
                    // fetch the chef data with include_recipes=true using the session user_id
                    const chefRes = await fetch(`/api/chefs/${session.user_id}?include_recipes=true`);
                    if (chefRes.ok) {
                        chefDataForInfo = await chefRes.json();

                        // store for later use in info tab population
                        chefDataToUse = chefDataForInfo;

                        // populate recipes
                        if (recipesGrid && chefDataForInfo.recipes && Array.isArray(chefDataForInfo.recipes) && chefDataForInfo.recipes.length > 0) {
                            chefDataForInfo.recipes.forEach((recipe) => {
                                const cardElement = createCardElement(recipe, 'chef'); // 'chef' role to show delete button
                                recipesGrid.appendChild(cardElement);
                            });
                        } else {
                            if (recipesGrid) {
                                recipesGrid.innerHTML =
                                    '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999; font-size: 16px;">' +
                                    '<p><i class="bi bi-book"></i></p>' +
                                    '<p>No recipes published</p>' +
                                    '</div>';
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error loading own chef data:", error);
                }
            }

            // settings modal 
            const openBtn = document.getElementById("settings-btn");
            if (openBtn) {
                openBtn.onclick = async () => {
                    modal.classList.remove("hidden");
                    // preload profile data when opening modal
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
                        showNotification("You must be logged in to update your profile", "error");
                        return;
                    }

                    const newUsername = (usernameInput.value || "").trim();
                    const newAvatar = (avatarInput.value || "").trim();

                    if (!newUsername) {
                        showNotification("Your username can not be empty", "error");
                        return;
                    }

                    // Disable button during save
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
                            showNotification("Error: " + (data.error || "Impossible to update profile"), "error");
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
                        // call the logout api
                        const response = await fetch("/logout", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        });

                        if (response.ok) {
                            // Clear localStorage to prevent state inconsistency
                            localStorage.clear();
                            // redirect to home after logout
                            window.location.href = "/";
                        } else {
                            console.error("Logout failed");
                        }
                    } catch (error) {
                        console.error("Error during logout:", error);
                    }
                };
            }
        } catch (error) {
            console.error("Error loading session:", error);
            window.location.href = "/login";
        }
    }

    // populate info tab
    const infoContent = document.querySelector(".info-content");
    if (infoContent && chefDataToUse) {
        let infoHTML = '';

        if (chefDataToUse.info && chefDataToUse.info.trim()) {
            infoHTML = `<p>${chefDataToUse.info}</p>`;
        } else {
            // if no info, show placeholder
            infoHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <p><i class="bi bi-info-circle" style="font-size: 32px;"></i></p>
          <p>No info available</p>
        </div>
      `;
        }

        infoContent.innerHTML = infoHTML;
    }

    // profile tabs functionality
    const profileTabBtns = document.querySelectorAll(".profile-tab-btn");
    const profileViews = document.querySelectorAll(".profile-view");

    profileTabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-tab");

            // remove active class from all buttons and views
            profileTabBtns.forEach((b) => b.classList.remove("active"));
            profileViews.forEach((v) => v.classList.remove("active"));

            // add active class to clicked button and corresponding view
            btn.classList.add("active");
            const viewElement = document.getElementById(`view-${tabName}`);
            if (viewElement) {
                viewElement.classList.add("active");
            }
        });
    });
});