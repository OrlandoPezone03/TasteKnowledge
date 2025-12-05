document.addEventListener("DOMContentLoaded", () => {

    // ===========================
    // ROLE SELECTION
    // ===========================
    const roleButtons = document.querySelectorAll('.role-btn');
    const roleInput = document.getElementById('roleInput'); // hidden input
    let selectedRole = "user"; // default

    // Imposta valore iniziale del campo hidden
    roleInput.value = selectedRole;

    roleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Rimuove active da tutti
            roleButtons.forEach(btn => btn.classList.remove('active'));

            // Aggiunge active al pulsante cliccato
            button.classList.add('active');

            // Aggiorna ruolo selezionato e hidden input
            selectedRole = button.dataset.role;
            roleInput.value = selectedRole;

            console.log("Selected role:", selectedRole);
        });
    });

    // ===========================
    // PASSWORD TOGGLE
    // ===========================
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    togglePassword.addEventListener('click', (e) => {
        e.preventDefault(); // previene comportamento del button

        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;

        const icon = togglePassword.querySelector('i');
        icon.classList.toggle('bi-eye-slash');
        icon.classList.toggle('bi-eye');
    });

    // ===========================
    // FORM SUBMIT
    // ===========================
    const form = document.querySelector('.form-container');

    form.addEventListener('submit', () => {
        console.log("Login attempt:", {
            email: document.getElementById('email').value,
            password: "******",
            role: selectedRole
        });
        // Il form invierà i dati normalmente a Flask
    });

});
