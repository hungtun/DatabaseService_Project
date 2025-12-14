// SQL Query Editor module

let currentDatabase = null;
let queryHistory = [];

document.addEventListener('DOMContentLoaded', function() {
    if (!apiService.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    initializeQueryEditor();
});

function initializeQueryEditor() {
    const queryForm = document.getElementById('queryForm');
    const queryTextarea = document.getElementById('queryTextarea');
    const runBtn = document.getElementById('runQueryBtn');
    const clearBtn = document.getElementById('clearQueryBtn');
    const databaseSelect = document.getElementById('databaseSelect');

    if (queryForm) {
        queryForm.addEventListener('submit', handleExecuteQuery);
    }


    if (clearBtn) {
        clearBtn.addEventListener('click', clearQuery);
    }

    loadDatabasesForSelect();
    loadQueryHistory();
}

async function loadDatabasesForSelect() {
    const databaseSelect = document.getElementById('databaseSelect');
    if (!databaseSelect) return;

    try {
        // TODO: Load danh sách database từ API
        // const databases = await apiService.getDatabases();
        // renderDatabaseSelect(databases);

        databaseSelect.innerHTML = '<option value="">-- Chọn database --</option>';
    } catch (error) {
        databaseSelect.innerHTML = '<option value="">Không thể tải danh sách database</option>';
    }
}

function renderDatabaseSelect(databases) {
    const databaseSelect = document.getElementById('databaseSelect');
    if (!databaseSelect) return;

    databaseSelect.innerHTML = '<option value="">-- Chọn database --</option>';

    if (databases && databases.length > 0) {
        databases.forEach(db => {
            const option = document.createElement('option');
            option.value = db.databaseName;
            option.textContent = db.databaseName;
            databaseSelect.appendChild(option);
        });
    }
}

async function handleExecuteQuery(e) {
    e.preventDefault();

    const databaseSelect = document.getElementById('databaseSelect');
    const queryTextarea = document.getElementById('queryTextarea');
    const resultContainer = document.getElementById('queryResult');
    const errorContainer = document.getElementById('queryError');
    const runBtn = document.getElementById('runQueryBtn');

    if (!databaseSelect || !queryTextarea) return;

    const databaseName = databaseSelect.value;
    const query = queryTextarea.value.trim();

    // Validate
    if (!databaseName) {
        showNotification('Vui lòng chọn database', 'error');
        return;
    }

    if (!query) {
        showNotification('Vui lòng nhập query', 'error');
        return;
    }

    // Disable button
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = 'Đang thực thi...';
    }

    if (errorContainer) errorContainer.textContent = '';
    if (resultContainer) resultContainer.innerHTML = '';

    const startTime = Date.now();

    try {
        const result = await apiService.executeQuery(databaseName, query);
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(3);

        // Lưu vào lịch sử
        saveQueryToHistory(query);

        // Hiển thị kết quả
        displayQueryResult(result, executionTime);

    } catch (error) {
        if (errorContainer) {
            errorContainer.textContent = error.message || 'Có lỗi xảy ra khi thực thi query';
        }
        showNotification('Query thất bại', 'error');
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = 'Chạy Query';
        }
    }
}

function displayQueryResult(result, executionTime) {
    const resultContainer = document.getElementById('queryResult');
    if (!resultContainer) return;

    if (result.rows && Array.isArray(result.rows)) {
        // Kết quả SELECT query
        if (result.rows.length === 0) {
            resultContainer.innerHTML = `
                <div class="query-result-info">
                    <p>Query thực thi thành công. Không có dữ liệu trả về.</p>
                    <p>Thời gian thực thi: ${executionTime}s</p>
                </div>
            `;
            return;
        }

        const columns = Object.keys(result.rows[0]);

        let html = `
            <div class="query-result-info">
                <p><strong>Số dòng:</strong> ${formatNumber(result.rows.length)}</p>
                <p><strong>Thời gian thực thi:</strong> ${executionTime}s</p>
                <button onclick="exportResult('${escapeHtml(JSON.stringify(result.rows))}')" class="btn btn-sm btn-secondary">Export CSV</button>
            </div>
            <div class="table-container">
                <table class="result-table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${result.rows.map(row => `
                            <tr>
                                ${columns.map(col => `<td>${escapeHtml(String(row[col] ?? 'NULL'))}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        resultContainer.innerHTML = html;
    } else if (result.affectedRows !== undefined) {
        // Kết quả INSERT/UPDATE/DELETE
        resultContainer.innerHTML = `
            <div class="query-result-info">
                <p><strong>Query thực thi thành công!</strong></p>
                <p><strong>Số dòng bị ảnh hưởng:</strong> ${formatNumber(result.affectedRows)}</p>
                <p><strong>Thời gian thực thi:</strong> ${executionTime}s</p>
            </div>
        `;
    } else {
        // Kết quả khác (CREATE, ALTER, DROP)
        resultContainer.innerHTML = `
            <div class="query-result-info">
                <p><strong>Query thực thi thành công!</strong></p>
                <p><strong>Thời gian thực thi:</strong> ${executionTime}s</p>
            </div>
        `;
    }
}

function clearQuery() {
    const queryTextarea = document.getElementById('queryTextarea');
    if (queryTextarea) {
        queryTextarea.value = '';
        queryTextarea.focus();
    }

    const resultContainer = document.getElementById('queryResult');
    if (resultContainer) resultContainer.innerHTML = '';

    const errorContainer = document.getElementById('queryError');
    if (errorContainer) errorContainer.textContent = '';
}

function saveQueryToHistory(query) {
    // Lưu vào localStorage
    queryHistory.unshift(query);
    if (queryHistory.length > 50) {
        queryHistory = queryHistory.slice(0, 50);
    }
    localStorage.setItem('query_history', JSON.stringify(queryHistory));
    loadQueryHistory();
}

function loadQueryHistory() {
    const historyList = document.getElementById('queryHistory');
    if (!historyList) return;

    try {
        const saved = localStorage.getItem('query_history');
        if (saved) {
            queryHistory = JSON.parse(saved);
        }
    } catch (e) {
        queryHistory = [];
    }

    if (queryHistory.length === 0) {
        historyList.innerHTML = '<p class="info-text">Chưa có lịch sử query</p>';
        return;
    }

    historyList.innerHTML = queryHistory.slice(0, 10).map((query, index) => `
        <div class="history-item" onclick="loadQueryFromHistory('${escapeHtml(query).replace(/'/g, "\\'")}')">
            <code>${escapeHtml(query.substring(0, 100))}${query.length > 100 ? '...' : ''}</code>
        </div>
    `).join('');
}

function loadQueryFromHistory(query) {
    const queryTextarea = document.getElementById('queryTextarea');
    if (queryTextarea) {
        queryTextarea.value = query;
        queryTextarea.focus();
    }
}

function exportResult(data) {
    try {
        const rows = JSON.parse(data);
        if (!rows || rows.length === 0) return;

        const columns = Object.keys(rows[0]);
        const csv = [
            columns.join(','),
            ...rows.map(row => columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `query_result_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Đã export kết quả', 'success');
    } catch (error) {
        showNotification('Không thể export kết quả', 'error');
    }
}

