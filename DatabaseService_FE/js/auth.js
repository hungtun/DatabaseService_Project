// Authentication logic

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Kiểm tra nếu đã đăng nhập thì chuyển đến dashboard
    if (apiService.getToken() && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html'))) {
        window.location.href = 'dashboard.html';
    }
});

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!errorDiv) return;

    errorDiv.textContent = '';

    // Validate
    if (!username) {
        errorDiv.textContent = 'Vui lòng nhập tên đăng nhập';
        return;
    }

    if (!password) {
        errorDiv.textContent = 'Vui lòng nhập mật khẩu';
        return;
    }

    // Disable button trong lúc xử lý
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý...';
    }

    try {
        const response = await apiService.login(username, password);

        if (response.success && response.token) {
            showNotification('Đăng nhập thành công!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            errorDiv.textContent = response.error || 'Đăng nhập thất bại';
            showNotification('Đăng nhập thất bại', 'error');
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Có lỗi xảy ra khi đăng nhập';
        showNotification('Đăng nhập thất bại', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng nhập';
        }
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!errorDiv) return;

    errorDiv.textContent = '';
    if (successDiv) successDiv.textContent = '';

    // Validate
    if (!username) {
        errorDiv.textContent = 'Vui lòng nhập tên đăng nhập';
        return;
    }

    if (username.length < 3) {
        errorDiv.textContent = 'Tên đăng nhập phải có ít nhất 3 ký tự';
        return;
    }

    if (!password) {
        errorDiv.textContent = 'Vui lòng nhập mật khẩu';
        return;
    }

    if (!validatePassword(password)) {
        errorDiv.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
        return;
    }

    // Disable button trong lúc xử lý
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý...';
    }

    try {
        const response = await apiService.register(username, password);

        if (response.success && response.token) {
            if (successDiv) {
                successDiv.textContent = 'Đăng ký thành công! Đang chuyển hướng...';
            }
            showNotification('Đăng ký thành công!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            errorDiv.textContent = response.error || 'Đăng ký thất bại';
            showNotification('Đăng ký thất bại', 'error');
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Có lỗi xảy ra khi đăng ký';
        showNotification('Đăng ký thất bại', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng ký';
        }
    }
}

function logout() {
    if (confirmDelete('Bạn có chắc chắn muốn đăng xuất?')) {
        apiService.clearToken();
        showNotification('Đã đăng xuất', 'info');
        window.location.href = 'login.html';
    }
}

