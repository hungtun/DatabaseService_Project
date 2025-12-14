// Database Explorer module - Khám phá cấu trúc database

document.addEventListener('DOMContentLoaded', function() {
    if (!apiService.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    initializeExplorer();
});

function initializeExplorer() {
    loadDatabasesTree();
}

async function loadDatabasesTree() {
    const explorerContainer = document.getElementById('databaseExplorer');
    if (!explorerContainer) return;

    try {
        // TODO: Load danh sách database từ API
        // const databases = await apiService.getDatabases();
        // renderDatabaseTree(databases);

        explorerContainer.innerHTML = '<p class="info-text">Chức năng đang được phát triển...</p>';
    } catch (error) {
        explorerContainer.innerHTML = `<p class="error-text">Không thể tải: ${error.message}</p>`;
    }
}

async function renderDatabaseTree(databases) {
    const explorerContainer = document.getElementById('databaseExplorer');
    if (!explorerContainer) return;

    if (!databases || databases.length === 0) {
        explorerContainer.innerHTML = '<p class="info-text">Chưa có database nào</p>';
        return;
    }

    let html = '<div class="explorer-tree">';

    for (const db of databases) {
        html += `
            <div class="tree-node">
                <div class="tree-node-header" onclick="toggleDatabaseNode('${db.databaseName}')">
                    <span class="tree-icon">📁</span>
                    <strong>${escapeHtml(db.databaseName)}</strong>
                </div>
                <div class="tree-node-children" id="db-${db.databaseName}" style="display: none;">
                    <div class="loading">Đang tải...</div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    explorerContainer.innerHTML = html;
}

async function toggleDatabaseNode(databaseName) {
    const childrenDiv = document.getElementById(`db-${databaseName}`);
    if (!childrenDiv) return;

    if (childrenDiv.style.display === 'none') {
        childrenDiv.style.display = 'block';

        // Load tables nếu chưa load
        if (childrenDiv.querySelector('.loading')) {
            await loadTables(databaseName, childrenDiv);
        }
    } else {
        childrenDiv.style.display = 'none';
    }
}

async function loadTables(databaseName, container) {
    try {
        const tables = await apiService.getTables(databaseName);

        if (!tables || tables.length === 0) {
            container.innerHTML = '<div class="info-text">Không có bảng nào</div>';
            return;
        }

        container.innerHTML = tables.map(table => `
            <div class="tree-node">
                <div class="tree-node-header" onclick="toggleTableNode('${databaseName}', '${table}')">
                    <span class="tree-icon">📊</span>
                    ${escapeHtml(table)}
                </div>
                <div class="tree-node-children" id="table-${databaseName}-${table}" style="display: none;">
                    <div class="table-actions">
                        <button onclick="viewTableStructure('${databaseName}', '${table}')" class="btn btn-sm btn-secondary">Cấu trúc</button>
                        <button onclick="viewTableData('${databaseName}', '${table}')" class="btn btn-sm btn-secondary">Dữ liệu</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = `<div class="error-text">Lỗi: ${error.message}</div>`;
    }
}

function toggleTableNode(databaseName, tableName) {
    const childrenDiv = document.getElementById(`table-${databaseName}-${tableName}`);
    if (!childrenDiv) return;

    if (childrenDiv.style.display === 'none') {
        childrenDiv.style.display = 'block';
    } else {
        childrenDiv.style.display = 'none';
    }
}

async function viewTableStructure(databaseName, tableName) {
    try {
        const structure = await apiService.getTableStructure(databaseName, tableName);

        const modal = document.getElementById('tableStructureModal');
        const modalContent = document.getElementById('tableStructureContent');

        if (!modal || !modalContent) return;

        modalContent.innerHTML = `
            <h3>Cấu trúc bảng: ${escapeHtml(tableName)}</h3>
            <div class="table-container">
                <table class="structure-table">
                    <thead>
                        <tr>
                            <th>Tên cột</th>
                            <th>Kiểu dữ liệu</th>
                            <th>Null</th>
                            <th>Key</th>
                            <th>Default</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${structure.map(col => `
                            <tr>
                                <td>${escapeHtml(col.name)}</td>
                                <td>${escapeHtml(col.type)}</td>
                                <td>${col.nullable ? 'YES' : 'NO'}</td>
                                <td>${col.key || ''}</td>
                                <td>${col.default !== null ? escapeHtml(String(col.default)) : 'NULL'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        modal.style.display = 'block';
    } catch (error) {
        showNotification('Không thể tải cấu trúc bảng: ' + error.message, 'error');
    }
}

async function viewTableData(databaseName, tableName, page = 1) {
    try {
        const data = await apiService.getTableData(databaseName, tableName, page, 100);

        const modal = document.getElementById('tableDataModal');
        const modalContent = document.getElementById('tableDataContent');

        if (!modal || !modalContent) return;

        if (!data.rows || data.rows.length === 0) {
            modalContent.innerHTML = `<h3>Dữ liệu bảng: ${escapeHtml(tableName)}</h3><p>Bảng trống</p>`;
        } else {
            const columns = Object.keys(data.rows[0]);

            modalContent.innerHTML = `
                <h3>Dữ liệu bảng: ${escapeHtml(tableName)}</h3>
                <p>Số dòng: ${formatNumber(data.total || data.rows.length)}</p>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.rows.map(row => `
                                <tr>
                                    ${columns.map(col => `<td>${escapeHtml(String(row[col] ?? 'NULL'))}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        modal.style.display = 'block';
    } catch (error) {
        showNotification('Không thể tải dữ liệu: ' + error.message, 'error');
    }
}

