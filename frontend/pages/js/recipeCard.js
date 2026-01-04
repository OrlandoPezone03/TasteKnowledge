// Recipe Card Creator
const RecipeCard = {
  // Create difficulty indicators using fire icons
  createDifficulty: function (difficulty) {
    let level = difficulty || 1;
    let difficultyIndicators = "";
    let i;

    for (i = 0; i < 5; i++) {
      if (i < level) {
        difficultyIndicators = difficultyIndicators + '<i style="color: red;" class="bi bi-fire"></i>';
      } else {
        difficultyIndicators = difficultyIndicators + '<i class="bi bi-fire" style="color: #ddd;"></i>';
      }
    }
    return difficultyIndicators;
  },

  // Handle recipe deletion
  handleDeleteRecipe: function (e, recipeId, title, card) {
    e.stopPropagation();
    e.preventDefault();

    let confirmDelete = confirm('Delete "' + title + '"?');
    if (!confirmDelete) {
      return;
    }

    try {
      fetch("/api/recipes/" + recipeId, { method: "DELETE" })
        .then(function (res) {
          if (res.ok) {
            card.remove();
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

    let recipeId = recipe._id;
    let imageSrc = recipe.image;
    let userAvatar = recipe.user_avatar;
    let userName = recipe.user_name;
    let title = recipe.title;
    let rating = recipe.rating || "0";
    let time = recipe.time;
    let difficulty = recipe.difficulty;

    // Create main card container
    let card = document.createElement("div");
    card.className = "recipe-card";

    // Create header with avatar and name
    let header = document.createElement("div");
    header.className = "recipe-header";

    let avatarImg = document.createElement("img");
    avatarImg.src = userAvatar;
    avatarImg.alt = userName;
    avatarImg.className = "user-avatar";

    let nameSpan = document.createElement("span");
    nameSpan.className = "user-name";
    nameSpan.textContent = userName;

    header.appendChild(avatarImg);
    header.appendChild(nameSpan);

    // Create delete button (hidden by default)
    let deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-recipe-btn hidden";
    deleteBtn.title = "Delete recipe";
    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';

    if (userRole === "chef") {
      deleteBtn.classList.remove("hidden");
      deleteBtn.classList.add("visible");
    }

    let self = this;
    deleteBtn.addEventListener("click", function (e) {
      self.handleDeleteRecipe(e, recipeId, title, card);
    });

    header.appendChild(deleteBtn);

    // Create recipe image
    let recipeImg = document.createElement("img");
    recipeImg.src = imageSrc;
    recipeImg.alt = title;
    recipeImg.className = "recipe-image";

    // Create footer with title, rating, and meta info
    let footer = document.createElement("div");
    footer.className = "recipe-footer";

    let titleH4 = document.createElement("h4");
    titleH4.textContent = title;

    let ratingDiv = document.createElement("div");
    ratingDiv.className = "rating";
    ratingDiv.innerHTML =
      '<i class="bi bi-star-fill"></i><span>' + rating + "</span>";

    let metaDiv = document.createElement("div");
    metaDiv.className = "recipe-meta";

    let difficultyDiv = document.createElement("div");
    difficultyDiv.className = "difficulty";
    difficultyDiv.innerHTML = this.createDifficulty(difficulty);

    let timeDiv = document.createElement("div");
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