document.addEventListener("DOMContentLoaded", () => {
    // Role selection
    const roleButtons = document.querySelectorAll('.role-btn');
    const roleInput = document.getElementById('roleInput'); // hidden input
    let selectedRole = "user"; // set user defaults

    // Initialize hidden role input field
    roleInput.value = selectedRole;

    roleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active from all buttons
            roleButtons.forEach(btn => btn.classList.remove('active'));

            // Add active to selected button
            button.classList.add('active');

            // Update selected role and hidden input
            selectedRole = button.dataset.role;
            roleInput.value = selectedRole;

            console.log("Selected role:", selectedRole);
        });
    });

    // Password visibility toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    togglePassword.addEventListener('click', (e) => {
        e.preventDefault(); // prevent form submission

        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;

        const icon = togglePassword.querySelector('i');
        icon.classList.toggle('bi-eye-slash'); // toggle eye slash
        icon.classList.toggle('bi-eye'); // toggle eye
    });

    // Form submit (AJAX via fetch)
    const form = document.querySelector('.credentials-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('roleInput').value || selectedRole;

        // Debug log
        console.log('Login attempt:', { email, role });

        // Prepare form data
        const body = new URLSearchParams();
        body.append('email', email);
        body.append('password', password);
        body.append('role', role);

        try {
            const resp = await fetch('/login', {
                method: 'POST',
                body: body,
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            });

            // Check for JSON response first
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await resp.json();
                
                // Check if response status is success (200-299)
                if (resp.ok && data && data.success) {
                    // Save role in localStorage for client-side use
                    if (data.role) {
                        localStorage.setItem('userRole', data.role);
                    }
                    // Redirect to the destination provided by backend
                    window.location.href = data.redirect || '/';
                    return;
                } else {
                    showLoginError(data.message || 'Login failed: check email/password');
                    console.warn('Login failed (json):', resp.status, data);
                    return;
                }
            }

            // Fall back to standard flow, check for redirect in response
            if (resp.redirected) {
                window.location.href = '/';
                return;
            }

            const text = await resp.text();
            showLoginError('Login failed: check email/password');
            console.warn('Login response (no redirect):', resp.status, text);

        } catch (err) {
            console.error('Login request failed', err);
            showLoginError('Impossible to reach server, try later.');
        }
    });

    // Show login error message
    function showLoginError(msg) {
        let el = document.querySelector('.login-error');
        if (!el) {
            el = document.createElement('div');
            el.className = 'login-error';
            el.style.color = '#b00020';
            el.style.marginTop = '12px';
            el.style.fontWeight = '600';
            form.parentNode.insertBefore(el, form.nextSibling);
        }
        el.textContent = msg;
    }
});