// Dashboard module - Quản lý database

document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra authentication
    if (!apiService.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    initializeDashboard();
});

function initializeDashboard() {
    const createDbForm = document.getElementById('createDbForm');
    if (createDbForm) {
        createDbForm.addEventListener('submit', handleCreateDatabase);
    }

    loadDashboard();
    setupModal();
}

async function loadDashboard() {
    // Load thống kê tổng quan
    await loadStatistics();

    // Load danh sách database
    await loadDatabases();
}

async function loadStatistics() {
    // Hiển thị thống kê đơn giản
    const statsContainer = document.getElementById('statistics');
    if (!statsContainer) return;

    try {
        // TODO: Load thống kê từ API khi có endpoint
        // const userStats = await apiService.getUserStats();

        // Tạm thời tính từ danh sách database đã load
        // Nếu chưa có API, sẽ cập nhật sau khi load databases
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Database hiện có</h3>
                <p class="stat-value" id="currentDatabasesCount">0</p>
            </div>
            <div class="stat-card">
                <h3>Giới hạn</h3>
                <p class="stat-value" id="databaseLimit">3</p>
            </div>
        `;

    } catch (error) {
        console.error('Error loading statistics:', error);
        statsContainer.innerHTML = '';
    }
}

// Cập nhật thống kê sau khi load danh sách database
function updateStatistics(databaseCount) {
    const countElement = document.getElementById('currentDatabasesCount');
    if (countElement) {
        countElement.textContent = databaseCount;
    }

    // Hiển thị cảnh báo nếu đã đạt giới hạn
    const limitElement = document.getElementById('databaseLimit');
    if (limitElement && databaseCount >= 3) {
        countElement.style.color = '#e74c3c';
    } else if (countElement) {
        countElement.style.color = '';
    }
}

async function loadDatabases() {
    const databasesList = document.getElementById('databasesList');
    if (!databasesList) return;

    databasesList.innerHTML = '<div class="loading">Đang tải...</div>';

    try {
        // TODO: Gọi API để lấy danh sách database
        // const databases = await apiService.getDatabases();
        // renderDatabases(databases);
        // updateStatistics(databases.length); // Cập nhật thống kê

        // Hiện tại chưa có API, hiển thị placeholder
        databasesList.innerHTML = `
            <div class="info-message">
                <p>Chức năng hiển thị danh sách database đang được phát triển...</p>
                <p>Vui lòng sử dụng API endpoint: GET /api/provision</p>
            </div>
        `;

        // Cập nhật thống kê = 0 vì chưa có dữ liệu
        updateStatistics(0);
    } catch (error) {
        databasesList.innerHTML = `
            <div class="error-message">
                <p>Không thể tải danh sách database: ${error.message}</p>
            </div>
        `;
        updateStatistics(0);
    }
}

function renderDatabases(databases) {
    const databasesList = document.getElementById('databasesList');
    if (!databasesList) return;

    if (!databases || databases.length === 0) {
        databasesList.innerHTML = '<div class="info-message">Bạn chưa có database nào. Hãy tạo database mới!</div>';
        updateStatistics(0);
        return;
    }

    databasesList.innerHTML = databases.map(db => `
        <div class="database-card" data-db-id="${db.id}">
            <div class="db-header">
                <h3>${escapeHtml(db.databaseName)}</h3>
                <div class="db-actions">
                    <button onclick="viewDatabase(${db.id})" class="btn btn-sm btn-secondary">Xem</button>
                    <button onclick="deleteDatabase(${db.id})" class="btn btn-sm btn-danger">Xóa</button>
                </div>
            </div>
            <div class="db-info">
                <p><strong>Ngày tạo:</strong> ${formatDate(db.createdAt)}</p>
            </div>
        </div>
    `).join('');

    // Cập nhật thống kê với số lượng database thực tế
    updateStatistics(databases.length);
}

async function handleCreateDatabase(e) {
    e.preventDefault();

    const dbName = document.getElementById('dbName').value.trim();
    const errorDiv = document.getElementById('dbError');
    const successDiv = document.getElementById('dbSuccess');

    if (errorDiv) errorDiv.textContent = '';
    if (successDiv) successDiv.textContent = '';

    // Kiểm tra giới hạn trước khi tạo
    const currentCount = parseInt(document.getElementById('currentDatabasesCount')?.textContent || '0');
    if (currentCount >= 3) {
        if (errorDiv) {
            errorDiv.textContent = 'Đã đạt giới hạn số lượng database (3 database). Vui lòng xóa database cũ trước khi tạo mới.';
        }
        showNotification('Đã đạt giới hạn số lượng database', 'error');
        return;
    }

    try {
        const response = await apiService.provisionDatabase(dbName || null);

        if (successDiv) {
            successDiv.textContent = 'Tạo database thành công!';
        }
        showNotification('Tạo database thành công!', 'success');

        showDatabaseInfo(response);

        // Reset form
        document.getElementById('createDbForm').reset();

        // Reload danh sách database
        setTimeout(() => {
            loadDatabases();
            loadStatistics();
        }, 1000);

    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Có lỗi xảy ra khi tạo database';
        }
        showNotification('Không thể tạo database', 'error');
    }
}

function showDatabaseInfo(dbInfo) {
    const modal = document.getElementById('dbInfoModal');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
        <div class="db-info">
            <p><strong>Tên Database:</strong> <code>${escapeHtml(dbInfo.databaseName)}</code></p>
            <p><strong>Username:</strong> <code>${escapeHtml(dbInfo.username)}</code></p>
            <p><strong>Password:</strong> <code id="dbPassword">${escapeHtml(dbInfo.password)}</code>
                <button onclick="copyPassword('${dbInfo.password}')" class="btn btn-sm btn-secondary">Copy</button>
            </p>
            <p><strong>Connection String:</strong></p>
            <pre class="connection-string"><code id="connectionString">${escapeHtml(dbInfo.connectionString)}</code></pre>
            <button onclick="copyConnectionString('${dbInfo.connectionString}')" class="btn btn-primary btn-block">Sao chép Connection String</button>
            <p class="warning-text">Lưu ý: Lưu thông tin này ở nơi an toàn. Bạn sẽ không thể xem lại password sau khi đóng cửa sổ này.</p>
        </div>
    `;

    modal.style.display = 'block';
}

function copyConnectionString(text) {
    copyToClipboard(text).then(success => {
        if (success) {
            showNotification('Đã sao chép connection string!', 'success');
        } else {
            showNotification('Không thể sao chép', 'error');
        }
    });
}

function copyPassword(password) {
    copyToClipboard(password).then(success => {
        if (success) {
            showNotification('Đã sao chép password!', 'success');
        } else {
            showNotification('Không thể sao chép', 'error');
        }
    });
}

function setupModal() {
    const modal = document.getElementById('dbInfoModal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.close');

    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

async function viewDatabase(id) {
    // TODO: Chuyển đến trang chi tiết database
    showNotification('Chức năng đang được phát triển', 'info');
}

async function deleteDatabase(id) {
    if (!confirmDelete('Bạn có chắc chắn muốn xóa database này? Hành động này không thể hoàn tác.')) {
        return;
    }

    try {
        await apiService.deleteDatabase(id);
        showNotification('Xóa database thành công!', 'success');
        loadDatabases();
        loadStatistics();
    } catch (error) {
        showNotification('Không thể xóa database: ' + error.message, 'error');
    }
}

