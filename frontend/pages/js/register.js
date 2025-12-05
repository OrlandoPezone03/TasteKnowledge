// ===========================
// ROLE SELECTION TOGGLE (usando EVENT DELEGATION)
// ===========================
function initRoleSelection() {
    const roleButtons = document.querySelectorAll('.role-btn');
    const roleInput = document.getElementById('roleInput');
    
    console.log("🔍 initRoleSelection: Found", roleButtons.length, "role buttons");
    console.log("🔍 roleInput:", roleInput);
    
    if (!roleInput) {
        console.warn("⚠️ roleInput not found");
        return;
    }
    
    if (roleButtons.length === 0) {
        console.warn("⚠️ No role buttons found");
        return;
    }
    
    let selectedRole = "user";
    roleInput.value = selectedRole;
    
    // Usa event delegation: ascolta i click su document, filtra per .role-btn
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.role-btn');
        if (!btn) return;
        
        console.log("✅ Role button clicked:", btn.dataset.role);
        e.preventDefault();
        e.stopPropagation();
        
        // Rimuovi active da tutti
        roleButtons.forEach(b => b.classList.remove('active'));
        
        // Aggiungi active al button cliccato
        btn.classList.add('active');
        
        // Aggiorna il valore
        selectedRole = btn.dataset.role;
        roleInput.value = selectedRole;
        
        console.log("✅ Selected role updated to:", selectedRole);
    }, true); // Usa capture phase per massima compatibilità
}


// ===========================
// PASSWORD TOGGLE VISIBILITY (usando EVENT DELEGATION)
// ===========================
function initPasswordToggle() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    console.log("🔍 initPasswordToggle: togglePassword:", togglePassword);
    console.log("🔍 initPasswordToggle: passwordInput:", passwordInput);

    if (!togglePassword || !passwordInput) {
        console.warn("⚠️ togglePassword or passwordInput not found");
        return;
    }

    // Usa event delegation
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-password');
        if (!btn) return;
        
        console.log("✅ Toggle password button clicked");
        e.preventDefault();
        e.stopPropagation();
        
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('bi-eye-slash');
            icon.classList.toggle('bi-eye');
            console.log("✅ Eye icon toggled, password type:", type);
        }
    }, true); // Usa capture phase
}


// ===========================
// FORM SUBMIT HANDLER
// ===========================
function initFormSubmit() {
    const form = document.querySelector('.form-container');
    console.log("🔍 initFormSubmit: form:", form);
    
    if (!form) {
        console.warn("⚠️ form not found");
        return;
    }

    form.addEventListener('submit', (e) => {
        const nickname = document.getElementById('nickname').value;
        const email = document.getElementById('email').value;
        const roleInput = document.getElementById('roleInput');
        const role = roleInput ? roleInput.value : 'user';

        console.log("✅ Form submitted:", {
            nickname,
            email,
            password: "******",
            role: role
        });
    });
}


// ===========================
// INIT ON DOM READY
// ===========================
console.log("📢 register.js loaded, document.readyState:", document.readyState);

if (document.readyState === 'loading') {
    console.log("⏳ DOM still loading, waiting for DOMContentLoaded...");
    document.addEventListener('DOMContentLoaded', () => {
        console.log("✅ DOMContentLoaded event fired");
        initRoleSelection();
        initPasswordToggle();
        initFormSubmit();
    });
} else {
    console.log("✅ DOM already loaded, initializing immediately...");
    initRoleSelection();
    initPasswordToggle();
    initFormSubmit();
}
