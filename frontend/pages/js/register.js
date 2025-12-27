document.addEventListener("DOMContentLoaded", () => {
    // Role selection
    const roleButtons = document.querySelectorAll('.role-btn');
    const roleInput = document.getElementById('roleInput');
    let selectedRole = "user";

    roleInput.value = selectedRole;

    roleButtons.forEach(button => {
        button.addEventListener('click', () => {
            roleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            selectedRole = button.dataset.role;
            roleInput.value = selectedRole;
        });
    });

    // Password visibility toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword) {
        togglePassword.addEventListener('click', (e) => {
            e.preventDefault();

            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;

            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('bi-eye-slash');
            icon.classList.toggle('bi-eye');
        });
    }

    // Submit form
    const form = document.querySelector('.credentials-form');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nickname = document.getElementById('nickname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = roleInput.value || selectedRole;

            const body = new URLSearchParams();
            body.append('nickname', nickname);
            body.append('email', email);
            body.append('password', password);
            body.append('role', role);

            try {
                const resp = await fetch('/register', {
                    method: 'POST',
                    body: body,
                    credentials: 'same-origin'
                });

                if (resp.redirected) {
                    window.location.href = resp.url;
                    return;
                }

                const text = await resp.text();
                if (resp.ok) {
                    window.location.href = '/login';
                } else {
                    showRegisterError('Registration failed: check your information');
                }
            } catch (err) {
                console.error('Registration request failed', err);
                showRegisterError('Impossible to reach server, try later.');
            }
        });
    }

    function showRegisterError(msg) {
        let el = document.querySelector('.register-error');
        if (!el) {
            el = document.createElement('div');
            el.className = 'register-error';
            el.style.color = '#b00020';
            el.style.marginTop = '12px';
            el.style.fontWeight = '600';
            form.parentNode.insertBefore(el, form.nextSibling);
        }
        el.textContent = msg;
    }
});