// Recipe Card Creator
var RecipeCard = {
  // Create difficulty indicators using fire icons
  createDifficulty: function (difficulty) {
    var level = difficulty || 1;
    var stars = "";
    var i;

    for (i = 0; i < 5; i++) {
      if (i < level) {
        stars = stars + '<i style="color: red;" class="bi bi-fire"></i>';
      } else {
        stars = stars + '<i class="bi bi-fire" style="color: #ddd;"></i>';
      }
    }
    return stars;
  },

  // Handle recipe deletion
  handleDeleteRecipe: function (e, recipeId, title, card) {
    e.stopPropagation();
    e.preventDefault();

    var confirmDelete = confirm('Delete "' + title + '"?');
    if (!confirmDelete) {
      return;
    }

    try {
      fetch("/api/recipes/" + recipeId, { method: "DELETE" })
        .then(function (res) {
          if (res.ok) {
            card.style.transition = "opacity 0.3s, transform 0.3s";
            card.style.opacity = "0";
            card.style.transform = "scale(0.8)";
            setTimeout(function () {
              card.remove();
            }, 300);
          } else {
            alert("Error deleting recipe.");
          }
        })
        .catch(function () {
          alert("Connection error.");
        });
    } catch (e) {
      alert("Connection error.");
    }
  },

  showDeleteButton: function (deleteBtn) {
    deleteBtn.classList.remove("hidden");
    deleteBtn.classList.add("visible");
  },

  hideDeleteButton: function (deleteBtn) {
    deleteBtn.classList.remove("visible");
    deleteBtn.classList.add("hidden");
  },

  // Create the recipe card element
  createCardElement: function (recipe, userRole) {
    if (!recipe) {
      return document.createElement("div");
    }

    var recipeId = recipe._id;
    var imageSrc = recipe.image;
    var userAvatar = recipe.user_avatar;
    var userName = recipe.user_name;
    var title = recipe.title;
    var rating = recipe.rating || "0";
    var time = recipe.time;
    var difficulty = recipe.difficulty;

    // Create main card container
    var card = document.createElement("div");
    card.className = "recipe-card";

    // Create header with avatar and name
    var header = document.createElement("div");
    header.className = "recipe-header";

    var avatarImg = document.createElement("img");
    avatarImg.src = userAvatar;
    avatarImg.alt = userName;
    avatarImg.className = "user-avatar";

    var nameSpan = document.createElement("span");
    nameSpan.className = "user-name";
    nameSpan.textContent = userName;

    header.appendChild(avatarImg);
    header.appendChild(nameSpan);

    // Create delete button (hidden by default)
    var deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-recipe-btn hidden";
    deleteBtn.title = "Delete recipe";
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';

    if (userRole === "chef") {
      deleteBtn.classList.remove("hidden");
      deleteBtn.classList.add("visible");
    }

    var self = this;
    deleteBtn.addEventListener("click", function (e) {
      self.handleDeleteRecipe(e, recipeId, title, card);
    });

    header.appendChild(deleteBtn);

    // Create recipe image
    var recipeImg = document.createElement("img");
    recipeImg.src = imageSrc;
    recipeImg.alt = title;
    recipeImg.className = "recipe-image";

    // Create footer with title, rating, and meta info
    var footer = document.createElement("div");
    footer.className = "recipe-footer";

    var titleH4 = document.createElement("h4");
    titleH4.textContent = title;

    var ratingDiv = document.createElement("div");
    ratingDiv.className = "rating";
    ratingDiv.innerHTML =
      '<i class="bi bi-star-fill"></i><span>' + rating + "</span>";

    var metaDiv = document.createElement("div");
    metaDiv.className = "recipe-meta";

    var difficultyDiv = document.createElement("div");
    difficultyDiv.className = "difficulty";
    difficultyDiv.innerHTML = this.createDifficulty(difficulty);

    var timeDiv = document.createElement("div");
    timeDiv.className = "time";
    timeDiv.innerHTML =
      '<i class="bi bi-clock"></i><span>' + (time || "--") + "</span>";

    metaDiv.appendChild(difficultyDiv);
    metaDiv.appendChild(timeDiv);

    footer.appendChild(titleH4);
    footer.appendChild(ratingDiv);
    footer.appendChild(metaDiv);

    // Assemble the card
    card.appendChild(header);
    card.appendChild(recipeImg);
    card.appendChild(footer);

    // Add click handler to navigate to recipe page
    card.addEventListener("click", function (e) {
      if (!e.target.closest(".delete-recipe-btn")) {
        window.location.href = "/recipe/" + recipeId;
      }
    });

    return card;
  },
};

// Wrapper function for compatibility
function createCardElement(recipe, userRole) {
  return RecipeCard.createCardElement(recipe, userRole);
}