// Database Explorer module - MySQL-like interface

let explorerCurrentDatabaseId = null;
let explorerCurrentDatabaseName = null;
let explorerCurrentTableName = null;
let explorerDatabasesCache = [];
let explorerTablesCache = {};
let currentActiveTab = 'structure';

document.addEventListener('DOMContentLoaded', function() {
    if (!apiService.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    initializeExplorer();
});

function initializeExplorer() {
    loadDatabasesToSidebar();
    setupModals();
    setupTabs();
}

async function loadDatabasesToSidebar() {
    const sidebar = document.getElementById('explorerSidebarTree');
    if (!sidebar) return;

    try {
        sidebar.innerHTML = '<div class="loading" style="padding: 10px; text-align: center;">Loading...</div>';
        const databases = await apiService.getDatabases();
        explorerDatabasesCache = Array.isArray(databases) ? databases : [];

        if (!explorerDatabasesCache.length) {
            sidebar.innerHTML = '<div class="info-text" style="padding: 15px;">No databases</div>';
            return;
        }

        // Nếu có dbId trên URL thì chọn sẵn database đó
        const params = new URLSearchParams(window.location.search);
        const targetIdStr = params.get('dbId');
        if (targetIdStr) {
            const targetId = parseInt(targetIdStr, 10);
            const db = explorerDatabasesCache.find(d => (d.id ?? d.Id) === targetId);
            if (db) {
                const name = db.databaseName ?? db.DatabaseName ?? '';
                await toggleDatabase(targetId, name);
                return;
            }
        }

        renderDatabaseTree();
    } catch (error) {
        sidebar.innerHTML = `<div class="error-text" style="padding: 15px;">Error: ${error.message}</div>`;
    }
}

function renderDatabaseTree() {
    const sidebar = document.getElementById('explorerSidebarTree');
    if (!sidebar) return;

    let html = '';
    explorerDatabasesCache.forEach(db => {
        const id = db.id ?? db.Id;
        const name = db.databaseName ?? db.DatabaseName ?? '';
        if (!id || !name) return;

        const isActive = explorerCurrentDatabaseId === id;
        const isExpanded = explorerTablesCache[id] !== undefined;

        html += `
            <div class="db-node ${isActive ? 'active' : ''}" onclick="toggleDatabase(${id}, '${escapeHtml(name)}')">
                <span class="node-expand">${isExpanded ? '▼' : '▶'}</span>
                <span class="node-icon">🗄️</span>
                <span>${escapeHtml(name)}</span>
            </div>
        `;

        if (isExpanded && explorerTablesCache[id]) {
            html += '<div class="table-list-container">';
            explorerTablesCache[id].forEach(table => {
                const tableName = table.tableName ?? table.TableName ?? '';
                const isTableActive = explorerCurrentTableName === tableName && explorerCurrentDatabaseId === id;
                html += `
                    <div class="table-node ${isTableActive ? 'active' : ''}" onclick="selectTable(${id}, '${escapeHtml(name)}', '${escapeHtml(tableName)}')">
                        <span class="node-icon">📊</span>
                        <span>${escapeHtml(tableName)}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
    });

    sidebar.innerHTML = html;
}

async function toggleDatabase(dbId, dbName) {
    if (explorerTablesCache[dbId] === undefined) {
        // Load tables for this database
        try {
            const tables = await apiService.getTables(dbId);
            explorerTablesCache[dbId] = Array.isArray(tables) ? tables : [];
        } catch (error) {
            showNotification('Cannot load tables: ' + error.message, 'error');
            explorerTablesCache[dbId] = [];
        }
    } else if (explorerCurrentDatabaseId === dbId) {
        // Collapse if already expanded
        delete explorerTablesCache[dbId];
        if (explorerCurrentDatabaseId === dbId) {
            explorerCurrentDatabaseId = null;
            explorerCurrentDatabaseName = null;
            explorerCurrentTableName = null;
            showEmptyWorkspace();
        }
        renderDatabaseTree();
        return;
    }

    explorerCurrentDatabaseId = dbId;
    explorerCurrentDatabaseName = dbName;
    explorerCurrentTableName = null;
    renderDatabaseTree();
    showDatabaseWorkspace();
}

async function selectTable(dbId, dbName, tableName) {
    explorerCurrentDatabaseId = dbId;
    explorerCurrentDatabaseName = dbName;
    explorerCurrentTableName = tableName;
    renderDatabaseTree();
    showTableWorkspace();
}

function showEmptyWorkspace() {
    const title = document.getElementById('workspaceTitle');
    const toolbar = document.getElementById('workspaceToolbar');
    const tabs = document.getElementById('workspaceTabs');
    const content = document.getElementById('workspaceContent');

    if (title) title.textContent = 'Database Explorer';
    if (toolbar) toolbar.innerHTML = '';
    if (tabs) tabs.style.display = 'none';
    if (content) {
        content.innerHTML = '<div class="workspace-empty"><p>Select a database or table from the Navigator to view details</p></div>';
    }
}

function showDatabaseWorkspace() {
    const title = document.getElementById('workspaceTitle');
    const toolbar = document.getElementById('workspaceToolbar');
    const tabs = document.getElementById('workspaceTabs');
    const content = document.getElementById('workspaceContent');

    if (title) title.textContent = `Database: ${explorerCurrentDatabaseName}`;
    if (toolbar) {
        toolbar.innerHTML = `
            <button class="btn btn-primary btn-sm" onclick="openCreateTable()">Create Table</button>
        `;
    }
    if (tabs) tabs.style.display = 'none';

    if (content) {
        const tables = explorerTablesCache[explorerCurrentDatabaseId] || [];
        if (tables.length === 0) {
            content.innerHTML = `
                <div class="workspace-empty">
                    <p>No tables in this database</p>
                    <button class="btn btn-primary" onclick="openCreateTable()">Create Table</button>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div style="padding: 20px;">
                    <h3>Tables (${tables.length})</h3>
                    <div class="table-container" style="margin-top: 15px;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Table Name</th>
                                    <th>Rows</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tables.map(t => {
                                    const name = t.tableName ?? t.TableName ?? '';
                                    const rows = t.rowCount ?? t.RowCount ?? 0;
                                    return `
                                        <tr>
                                            <td><strong>${escapeHtml(name)}</strong></td>
                                            <td>${formatNumber(rows)}</td>
                                            <td>
                                                <button class="btn btn-sm btn-secondary" onclick="selectTable(${explorerCurrentDatabaseId}, '${escapeHtml(explorerCurrentDatabaseName)}', '${escapeHtml(name)}')">Open</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }
}

function showTableWorkspace() {
    const title = document.getElementById('workspaceTitle');
    const toolbar = document.getElementById('workspaceToolbar');
    const tabs = document.getElementById('workspaceTabs');
    const content = document.getElementById('workspaceContent');

    if (title) title.textContent = `${explorerCurrentDatabaseName} / ${explorerCurrentTableName}`;
    if (toolbar) {
        toolbar.innerHTML = `
            <button class="btn btn-sm btn-danger" onclick="confirmDropTable(${explorerCurrentDatabaseId}, '${explorerCurrentTableName}')">Xóa table</button>
        `;
    }
    if (tabs) {
        tabs.style.display = 'flex';
    }

    loadTabContent(currentActiveTab);
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');

    currentActiveTab = tabName;
    loadTabContent(tabName);
}

async function loadTabContent(tabName) {
    const content = document.getElementById('workspaceContent');
    if (!content || !explorerCurrentDatabaseId || !explorerCurrentTableName) return;

    if (tabName === 'structure') {
        await loadStructureTab(content);
    } else if (tabName === 'data') {
        await loadDataTab(content);
    } else if (tabName === 'info') {
        await loadInfoTab(content);
    }
}

async function loadStructureTab(container) {
    container.innerHTML = '<div class="loading">Đang tải cấu trúc...</div>';
    try {
        const structure = await apiService.getTableStructure(explorerCurrentDatabaseId, explorerCurrentTableName);
        if (!structure || structure.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px;">
                    <div class="info-text">Chưa có cột nào</div>
                    <button class="btn btn-primary" onclick="openAddColumn(${explorerCurrentDatabaseId}, '${explorerCurrentTableName}')">Thêm cột đầu tiên</button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3>Cấu trúc bảng: ${escapeHtml(explorerCurrentTableName)}</h3>
                    <button class="btn btn-primary" onclick="openAddColumn(${explorerCurrentDatabaseId}, '${explorerCurrentTableName}')">Thêm cột</button>
                </div>
                <div class="table-container">
                    <table class="structure-table">
                        <thead>
                            <tr>
                                <th>Tên cột</th>
                                <th>Kiểu dữ liệu</th>
                                <th>Nullable</th>
                                <th>Key</th>
                                <th>Default</th>
                                <th style="width: 120px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${structure.map(col => {
                                const name = col.columnName ?? col.ColumnName ?? '';
                                const dataType = col.dataType ?? col.DataType ?? '';
                                const maxLength = col.maxLength ?? col.MaxLength;
                                const isNullable = col.isNullable ?? col.IsNullable;
                                const isPrimaryKey = col.isPrimaryKey ?? col.IsPrimaryKey;
                                const defaultValue = col.defaultValue ?? col.DefaultValue;

                                return `
                                    <tr>
                                        <td><strong>${escapeHtml(name)}</strong></td>
                                        <td>${escapeHtml(dataType)}${maxLength ? ` (${maxLength})` : ''}</td>
                                        <td>${isNullable ? 'YES' : 'NO'}</td>
                                        <td>${isPrimaryKey ? 'PK' : ''}</td>
                                        <td>${defaultValue !== null && defaultValue !== undefined ? escapeHtml(String(defaultValue)) : 'NULL'}</td>
                                        <td>
                                            ${!isPrimaryKey ? `<button class="btn btn-sm btn-danger" onclick="deleteColumnDirect('${escapeHtml(name)}')">Xóa</button>` : '<span style="color: #95a5a6;">Không thể xóa PK</span>'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-text">Lỗi: ${error.message}</div>`;
    }
}

async function deleteColumnDirect(columnName) {
    if (!confirm(`Bạn có chắc muốn xóa cột "${columnName}"? Dữ liệu trong cột sẽ bị mất vĩnh viễn.`)) return;

    try {
        await apiService.dropColumn(explorerCurrentDatabaseId, explorerCurrentTableName, columnName);
        showNotification('Xóa cột thành công', 'success');
        loadTabContent('structure');
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
}

async function loadDataTab(container) {
    container.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
    try {
        const data = await apiService.getTableData(explorerCurrentDatabaseId, explorerCurrentTableName, 1, 100);
        const rows = data.rows || data.Rows || [];
        const columns = data.columns || data.Columns || (rows[0] ? Object.keys(rows[0]) : []);

        if (rows.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; min-height: 260px; display: flex; align-items: center; justify-content: center;">
                    <div style="text-align: center;">
                        <div class="info-text" style="margin-bottom: 12px;">Chưa có dữ liệu trong bảng</div>
                        <button class="btn btn-primary" onclick="openInsertRow(${explorerCurrentDatabaseId}, '${explorerCurrentTableName}')">Thêm dữ liệu đầu tiên</button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <h3>Dữ liệu bảng: ${escapeHtml(explorerCurrentTableName)}</h3>
                        <p>Hiển thị ${rows.length} dòng</p>
                    </div>
                    <button class="btn btn-primary" onclick="openInsertRow(${explorerCurrentDatabaseId}, '${explorerCurrentTableName}')">Thêm dòng mới</button>
                </div>
                <div class="table-container" style="margin-top: 15px;">
                    <table class="data-table editable-table">
                        <thead>
                            <tr>
                                ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                                <th style="width: 150px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((row, idx) => {
                                const rowJson = JSON.stringify(row).replace(/"/g, '&quot;');
                                return `
                                    <tr data-row-index="${idx}" data-row='${rowJson}'>
                                        ${columns.map(col => `<td data-column="${escapeHtml(col)}">${escapeHtml(String(row[col] ?? 'NULL'))}</td>`).join('')}
                                        <td class="action-cell">
                                            <button class="btn btn-sm btn-secondary" onclick="editRowInline(${idx})">Sửa</button>
                                            <button class="btn btn-sm btn-danger" onclick="deleteRowDirect(${idx})">Xóa</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-text">Lỗi: ${error.message}</div>`;
    }
}

async function editRowInline(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;

    const rowData = JSON.parse(row.getAttribute('data-row').replace(/&quot;/g, '"'));
    const cells = row.querySelectorAll('td[data-column]');
    const actionCell = row.querySelector('.action-cell');

    // Convert cells to inputs
    cells.forEach(cell => {
        const column = cell.getAttribute('data-column');
        const value = rowData[column];
        const displayValue = value === null ? '' : value;
        cell.innerHTML = `<input type="text" class="inline-edit-input" data-column="${column}" value="${escapeHtml(String(displayValue))}">`;
    });

    // Change action buttons
    actionCell.innerHTML = `
        <button class="btn btn-sm btn-primary" onclick="saveRowInline(${rowIndex})">Lưu</button>
        <button class="btn btn-sm btn-secondary" onclick="cancelRowInline(${rowIndex})">Hủy</button>
    `;
}

async function saveRowInline(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;

    const originalData = JSON.parse(row.getAttribute('data-row').replace(/&quot;/g, '"'));
    const inputs = row.querySelectorAll('.inline-edit-input');

    const newData = {};
    const whereClause = {};

    inputs.forEach(input => {
        const column = input.getAttribute('data-column');
        const value = input.value.trim();
        newData[column] = value === '' ? null : value;
    });

    // Build WHERE clause (use primary key or all original values)
    if (originalData.id !== undefined) {
        whereClause.id = originalData.id;
    } else if (originalData.Id !== undefined) {
        whereClause.Id = originalData.Id;
    } else {
        // Use all columns as WHERE if no ID
        Object.assign(whereClause, originalData);
    }

    try {
        await apiService.updateData(explorerCurrentDatabaseId, {
            tableName: explorerCurrentTableName,
            data: newData,
            where: whereClause
        });
        showNotification('Cập nhật thành công', 'success');
        loadTabContent('data');
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
        cancelRowInline(rowIndex);
    }
}

function cancelRowInline(rowIndex) {
    loadTabContent('data');
}

async function deleteRowDirect(rowIndex) {
    if (!confirm('Bạn có chắc muốn xóa dòng này?')) return;

    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;

    const rowData = JSON.parse(row.getAttribute('data-row').replace(/&quot;/g, '"'));
    const whereClause = {};

    // Build WHERE clause
    if (rowData.id !== undefined) {
        whereClause.id = rowData.id;
    } else if (rowData.Id !== undefined) {
        whereClause.Id = rowData.Id;
    } else {
        Object.assign(whereClause, rowData);
    }

    try {
        await apiService.deleteData(explorerCurrentDatabaseId, {
            tableName: explorerCurrentTableName,
            where: whereClause
        });
        showNotification('Xóa thành công', 'success');
        loadTabContent('data');
    } catch (error) {
        showNotification('Lỗi: ' + error.message, 'error');
    }
}

async function loadInfoTab(container) {
    const tables = explorerTablesCache[explorerCurrentDatabaseId] || [];
    const tableInfo = tables.find(t => (t.tableName ?? t.TableName) === explorerCurrentTableName);
    const rowCount = tableInfo ? (tableInfo.rowCount ?? tableInfo.RowCount ?? 0) : 0;

    container.innerHTML = `
        <div style="padding: 20px;">
            <h3>Table Information</h3>
            <table style="margin-top: 15px;">
                <tr><th style="text-align: left; padding: 8px;">Database:</th><td style="padding: 8px;">${escapeHtml(explorerCurrentDatabaseName)}</td></tr>
                <tr><th style="text-align: left; padding: 8px;">Table:</th><td style="padding: 8px;">${escapeHtml(explorerCurrentTableName)}</td></tr>
                <tr><th style="text-align: left; padding: 8px;">Rows:</th><td style="padding: 8px;">${formatNumber(rowCount)}</td></tr>
            </table>
        </div>
    `;
}

// CRUD Operations

async function openCreateTable() {
    if (!explorerCurrentDatabaseId) {
        showNotification('Vui lòng chọn database trước', 'error');
        return;
    }

    const modal = document.getElementById('createTableModal');
    const nameInput = document.getElementById('createTableName');
    const pkCheckbox = document.getElementById('createTableIdPrimaryKey');
    const autoIncCheckbox = document.getElementById('createTableIdAutoIncrement');
    const errorDiv = document.getElementById('createTableError');
    const infoDiv = document.getElementById('createTableInfo');

    if (!modal || !nameInput || !errorDiv) return;

    nameInput.value = '';
    if (pkCheckbox) pkCheckbox.checked = true;
    if (autoIncCheckbox) autoIncCheckbox.checked = true;
    errorDiv.textContent = '';
    if (infoDiv) infoDiv.style.display = 'block';

    modal.style.display = 'block';
    nameInput.focus();
}

async function openAddColumn(databaseId, tableName) {
    const modal = document.getElementById('addColumnModal');
    const nameInput = document.getElementById('addColumnName');
    const typeInput = document.getElementById('addColumnType');
    const nullableInput = document.getElementById('addColumnNullable');
    const defaultInput = document.getElementById('addColumnDefault');
    const errorDiv = document.getElementById('addColumnError');

    if (!modal) return;

    if (nameInput) nameInput.value = '';
    if (typeInput) typeInput.value = 'VARCHAR(255)';
    if (nullableInput) nullableInput.checked = true;
    if (defaultInput) defaultInput.value = '';
    if (errorDiv) errorDiv.textContent = '';

    modal.style.display = 'block';
    if (nameInput) nameInput.focus();
}

async function openInsertRow(databaseId, tableName) {
    const modal = document.getElementById('insertRowModal');
    const formContainer = document.getElementById('insertRowForm');
    const errorDiv = document.getElementById('insertRowError');

    if (!modal || !formContainer) return;

    formContainer.innerHTML = '<div class="loading">Đang tải cấu trúc...</div>';
    if (errorDiv) errorDiv.textContent = '';
    modal.style.display = 'block';

    try {
        const structure = await apiService.getTableStructure(databaseId, tableName);
        if (!structure || structure.length === 0) {
            formContainer.innerHTML = '<p class="error-text">Không thể tải cấu trúc bảng</p>';
            return;
        }

        let html = '';
        structure.forEach(col => {
            const name = col.columnName ?? col.ColumnName ?? '';
            const dataType = col.dataType ?? col.DataType ?? '';
            const isNullable = col.isNullable ?? col.IsNullable;
            const isPrimaryKey = col.isPrimaryKey ?? col.IsPrimaryKey;
            const defaultValue = col.defaultValue ?? col.DefaultValue;

            // Skip id column if it's primary key (usually auto increment) to avoid requiring it on insert
            if (dataType.toLowerCase().includes('auto_increment') || (name.toLowerCase() === 'id' && isPrimaryKey)) {
                return;
            }

            const inputId = `insert_field_${name}`;
            const required = !isNullable ? 'required' : '';
            const placeholder = defaultValue ? `Mặc định: ${defaultValue}` : (isNullable ? 'NULL' : 'Bắt buộc');

            html += `
                <div class="form-group">
                    <label for="${inputId}">
                        ${escapeHtml(name)}
                        <span style="color: #95a5a6; font-size: 12px;">(${escapeHtml(dataType)})</span>
                        ${!isNullable ? '<span style="color: red;">*</span>' : ''}
                    </label>
                    ${getInputFieldByType(inputId, name, dataType, placeholder, required)}
                </div>
            `;
        });

        formContainer.innerHTML = html;
        const firstInput = formContainer.querySelector('input, textarea');
        if (firstInput) firstInput.focus();

    } catch (error) {
        formContainer.innerHTML = `<p class="error-text">Lỗi: ${error.message}</p>`;
    }
}

function getInputFieldByType(id, name, dataType, placeholder, required) {
    const lowerType = dataType.toLowerCase();

    if (lowerType.includes('text') || lowerType.includes('longtext')) {
        return `<textarea id="${id}" data-column="${escapeHtml(name)}" rows="3" placeholder="${escapeHtml(placeholder)}" ${required}></textarea>`;
    } else if (lowerType.includes('date') && !lowerType.includes('datetime')) {
        return `<input type="date" id="${id}" data-column="${escapeHtml(name)}" ${required}>`;
    } else if (lowerType.includes('datetime') || lowerType.includes('timestamp')) {
        return `<input type="datetime-local" id="${id}" data-column="${escapeHtml(name)}" ${required}>`;
    } else if (lowerType.includes('boolean') || lowerType.includes('tinyint(1)')) {
        return `<select id="${id}" data-column="${escapeHtml(name)}">
                    <option value="1">Đúng</option>
                    <option value="0" selected>Sai</option>
                </select>`;
    } else if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('decimal')) {
        return `<input type="number" id="${id}" data-column="${escapeHtml(name)}" step="any" placeholder="${escapeHtml(placeholder)}" ${required}>`;
    } else {
        return `<input type="text" id="${id}" data-column="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${required}>`;
    }
}

async function openUpdateRow(databaseId, tableName) {
    const modal = document.getElementById('updateRowModal');
    const dataInput = document.getElementById('updateRowData');
    const whereInput = document.getElementById('updateRowWhere');
    const errorDiv = document.getElementById('updateRowError');

    if (!modal) return;

    if (dataInput) dataInput.value = '{"column1":"new value"}';
    if (whereInput) whereInput.value = '{"id":1}';
    if (errorDiv) errorDiv.textContent = '';

    modal.style.display = 'block';
    if (dataInput) dataInput.focus();
}

async function openDeleteRow(databaseId, tableName) {
    const modal = document.getElementById('deleteRowModal');
    const whereInput = document.getElementById('deleteRowWhere');
    const errorDiv = document.getElementById('deleteRowError');

    if (!modal) return;

    if (whereInput) whereInput.value = '{"id":1}';
    if (errorDiv) errorDiv.textContent = '';

    modal.style.display = 'block';
    if (whereInput) whereInput.focus();
}

async function confirmDropTable(databaseId, tableName) {
    const modal = document.getElementById('dropTableModal');
    const message = document.getElementById('dropTableMessage');

    if (!modal) return;

    if (message) message.textContent = `Are you sure you want to drop table "${tableName}"? This action cannot be undone.`;
    modal.style.display = 'block';
}

async function viewTableStructure(databaseId, tableName) {
    try {
        const structure = await apiService.getTableStructure(databaseId, tableName);
        const modal = document.getElementById('tableStructureModal');
        const modalContent = document.getElementById('tableStructureContent');

        if (!modal || !modalContent) return;

        if (!structure || structure.length === 0) {
            modalContent.innerHTML = `<h3>Structure: ${escapeHtml(tableName)}</h3><p>No columns found</p>`;
            modal.style.display = 'block';
            return;
        }

        const rowsHtml = structure.map(col => {
            const name = col.columnName ?? col.ColumnName ?? '';
            const dataType = col.dataType ?? col.DataType ?? '';
            const isNullable = col.isNullable ?? col.IsNullable;
            const isPrimaryKey = col.isPrimaryKey ?? col.IsPrimaryKey;
            const defaultValue = col.defaultValue ?? col.DefaultValue;
            const maxLength = col.maxLength ?? col.MaxLength;

            return `
                <tr>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(dataType)}${maxLength ? ` (${maxLength})` : ''}</td>
                    <td>${isNullable ? 'YES' : 'NO'}</td>
                    <td>${isPrimaryKey ? 'PK' : ''}</td>
                    <td>${defaultValue !== null && defaultValue !== undefined ? escapeHtml(String(defaultValue)) : 'NULL'}</td>
                </tr>
            `;
        }).join('');

        modalContent.innerHTML = `
            <h3>Structure: ${escapeHtml(tableName)}</h3>
            <div class="table-container">
                <table class="structure-table">
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Data Type</th>
                            <th>Null</th>
                            <th>Key</th>
                            <th>Default</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;

        modal.style.display = 'block';
    } catch (error) {
        showNotification('Cannot load structure: ' + error.message, 'error');
    }
}

async function viewTableData(databaseId, tableName, page = 1) {
    try {
        const data = await apiService.getTableData(databaseId, tableName, page, 100);
        const modal = document.getElementById('tableDataModal');
        const modalContent = document.getElementById('tableDataContent');

        if (!modal || !modalContent) return;

        const rows = data.rows || data.Rows || [];
        const columns = data.columns || data.Columns || (rows[0] ? Object.keys(rows[0]) : []);
        const total = data.rowCount ?? data.RowCount ?? rows.length;

        if (!rows || rows.length === 0) {
            modalContent.innerHTML = `<h3>Data: ${escapeHtml(tableName)}</h3><p>Table is empty</p>`;
        } else {
            modalContent.innerHTML = `
                <h3>Data: ${escapeHtml(tableName)}</h3>
                <p>Rows: ${formatNumber(total)}</p>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(row => `
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
        showNotification('Cannot load data: ' + error.message, 'error');
    }
}

// Setup modals
function setupModals() {
    setupCreateTableModal();
    setupAddColumnModal();
    setupInsertRowModal();
    setupUpdateRowModal();
    setupDeleteRowModal();
    setupDropTableModal();
    setupViewModals();
}

function setupCreateTableModal() {
    const modal = document.getElementById('createTableModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeCreateTableModal');
    const cancelBtn = document.getElementById('cancelCreateTable');
    const submitBtn = document.getElementById('submitCreateTable');

    function closeModal() {
        modal.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            const nameInput = document.getElementById('createTableName');
            const pkCheckbox = document.getElementById('createTableIdPrimaryKey');
            const autoIncCheckbox = document.getElementById('createTableIdAutoIncrement');
            const errorDiv = document.getElementById('createTableError');

            if (!explorerCurrentDatabaseId) {
                showNotification('Vui lòng chọn database trước', 'error');
                return;
            }

            if (!nameInput || !errorDiv) return;

            const tableName = nameInput.value.trim();
            if (!tableName) {
                errorDiv.textContent = 'Tên table không được để trống';
                return;
            }

            const makeAutoInc = autoIncCheckbox ? autoIncCheckbox.checked : true;
            let makePk = pkCheckbox ? pkCheckbox.checked : true;

            // MySQL requires AUTO_INCREMENT column to be indexed (PRIMARY KEY or UNIQUE).
            if (makeAutoInc && !makePk) {
                makePk = true;
                if (pkCheckbox) pkCheckbox.checked = true;
            }

            const columns = [{
                name: 'id',
                dataType: 'INT',
                isPrimaryKey: makePk,
                isAutoIncrement: makeAutoInc,
                isNullable: false
            }];

            errorDiv.textContent = '';

            try {
                await apiService.createTable(explorerCurrentDatabaseId, { tableName, columns });
                showNotification('Tạo table thành công!', 'success');
                closeModal();
                // Refresh tables and open the new table
                delete explorerTablesCache[explorerCurrentDatabaseId];
                await toggleDatabase(explorerCurrentDatabaseId, explorerCurrentDatabaseName);
                // Select the newly created table
                await selectTable(explorerCurrentDatabaseId, explorerCurrentDatabaseName, tableName);
                // Switch to structure tab so user can add columns
                switchTab('structure');
            } catch (error) {
                errorDiv.textContent = error.message || 'Không thể tạo table';
            }
        });
    }
}

function setupAddColumnModal() {
    const modal = document.getElementById('addColumnModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeAddColumnModal');
    const cancelBtn = document.getElementById('cancelAddColumn');
    const submitBtn = document.getElementById('submitAddColumn');

    function closeModal() {
        modal.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            const nameInput = document.getElementById('addColumnName');
            const typeInput = document.getElementById('addColumnType');
            const nullableInput = document.getElementById('addColumnNullable');
            const defaultInput = document.getElementById('addColumnDefault');
            const errorDiv = document.getElementById('addColumnError');

            if (!explorerCurrentDatabaseId || !explorerCurrentTableName) {
                showNotification('Please select a table first', 'error');
                return;
            }

            if (!nameInput || !typeInput || !errorDiv) return;

            const name = nameInput.value.trim();
            const dataType = typeInput.value.trim();
            const isNullable = nullableInput ? nullableInput.checked : true;
            const defaultValue = defaultInput ? defaultInput.value.trim() : '';

            if (!name || !dataType) {
                errorDiv.textContent = 'Column name and data type are required';
                return;
            }

            errorDiv.textContent = '';

            try {
                await apiService.addColumn(explorerCurrentDatabaseId, explorerCurrentTableName, {
                    name,
                    dataType,
                    isNullable,
                    defaultValue: defaultValue || null
                });
                showNotification('Column added successfully', 'success');
                closeModal();
                // Refresh current view
                if (currentActiveTab === 'structure') {
                    loadTabContent('structure');
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Cannot add column';
            }
        });
    }
}

function setupInsertRowModal() {
    const modal = document.getElementById('insertRowModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeInsertRowModal');
    const cancelBtn = document.getElementById('cancelInsertRow');
    const submitBtn = document.getElementById('submitInsertRow');

    function closeModal() {
        modal.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            const formContainer = document.getElementById('insertRowForm');
            const errorDiv = document.getElementById('insertRowError');

            if (!explorerCurrentDatabaseId || !explorerCurrentTableName) {
                showNotification('Vui lòng chọn bảng trước', 'error');
                return;
            }

            if (!formContainer || !errorDiv) return;

            // Collect data from form fields
            const inputs = formContainer.querySelectorAll('input, textarea, select');
            const data = {};
            let hasError = false;

            inputs.forEach(input => {
                const column = input.getAttribute('data-column');
                if (!column) return;

                const value = input.value.trim();
                const required = input.hasAttribute('required');

                if (required && !value) {
                    hasError = true;
                    input.style.borderColor = 'red';
                } else {
                    input.style.borderColor = '';
                    data[column] = value === '' ? null : value;
                }
            });

            if (hasError) {
                errorDiv.textContent = 'Vui lòng điền đầy đủ các trường bắt buộc (*)';
                return;
            }

            errorDiv.textContent = '';

            try {
                await apiService.insertData(explorerCurrentDatabaseId, {
                    tableName: explorerCurrentTableName,
                    data
                });
                showNotification('Thêm dữ liệu thành công', 'success');
                closeModal();
                // Refresh data view
                if (currentActiveTab === 'data') {
                    loadTabContent('data');
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Không thể thêm dữ liệu';
            }
        });
    }
}

function setupUpdateRowModal() {
    const modal = document.getElementById('updateRowModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeUpdateRowModal');
    const cancelBtn = document.getElementById('cancelUpdateRow');
    const submitBtn = document.getElementById('submitUpdateRow');

    function closeModal() {
        modal.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            const dataInput = document.getElementById('updateRowData');
            const whereInput = document.getElementById('updateRowWhere');
            const errorDiv = document.getElementById('updateRowError');

            if (!explorerCurrentDatabaseId || !explorerCurrentTableName) {
                showNotification('Please select a table first', 'error');
                return;
            }

            if (!dataInput || !whereInput || !errorDiv) return;

            let data, where;
            try {
                data = JSON.parse(dataInput.value);
                where = JSON.parse(whereInput.value);
            } catch (err) {
                errorDiv.textContent = 'Invalid JSON: ' + err.message;
                return;
            }

            errorDiv.textContent = '';

            try {
                await apiService.updateData(explorerCurrentDatabaseId, {
                    tableName: explorerCurrentTableName,
                    data,
                    where
                });
                showNotification('Row updated successfully', 'success');
                closeModal();
                if (currentActiveTab === 'data') {
                    loadTabContent('data');
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Cannot update row';
            }
        });
    }
}

function setupDeleteRowModal() {
    const modal = document.getElementById('deleteRowModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeDeleteRowModal');
    const cancelBtn = document.getElementById('cancelDeleteRow');
    const submitBtn = document.getElementById('submitDeleteRow');

    function closeModal() {
        modal.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            const whereInput = document.getElementById('deleteRowWhere');
            const errorDiv = document.getElementById('deleteRowError');

            if (!explorerCurrentDatabaseId || !explorerCurrentTableName) {
                showNotification('Please select a table first', 'error');
                return;
            }

            if (!whereInput || !errorDiv) return;

            let where;
            try {
                where = JSON.parse(whereInput.value);
            } catch (err) {
                errorDiv.textContent = 'Invalid JSON: ' + err.message;
                return;
            }

            errorDiv.textContent = '';

            try {
                await apiService.deleteData(explorerCurrentDatabaseId, {
                    tableName: explorerCurrentTableName,
                    where
                });
                showNotification('Row deleted successfully', 'success');
                closeModal();
                if (currentActiveTab === 'data') {
                    loadTabContent('data');
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Cannot delete row';
            }
        });
    }
}

function setupDropTableModal() {
    const modal = document.getElementById('dropTableModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeDropTableModal');
    const cancelBtn = document.getElementById('cancelDropTable');
    const submitBtn = document.getElementById('submitDropTable');

    function closeModal() {
        modal.style.display = 'none';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            if (!explorerCurrentDatabaseId || !explorerCurrentTableName) {
                showNotification('Please select a table first', 'error');
                return;
            }

            try {
                await apiService.dropTable(explorerCurrentDatabaseId, explorerCurrentTableName);
                showNotification('Table dropped successfully', 'success');
                closeModal();
                // Refresh and show database view
                delete explorerTablesCache[explorerCurrentDatabaseId];
                explorerCurrentTableName = null;
                await toggleDatabase(explorerCurrentDatabaseId, explorerCurrentDatabaseName);
            } catch (error) {
                showNotification('Cannot drop table: ' + error.message, 'error');
            }
        });
    }
}

function setupViewModals() {
    const structureModal = document.getElementById('tableStructureModal');
    const dataModal = document.getElementById('tableDataModal');

    [structureModal, dataModal].forEach(modal => {
        if (!modal) return;
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
    });

    window.addEventListener('click', function(event) {
        if (event.target === structureModal) {
            structureModal.style.display = 'none';
        }
        if (event.target === dataModal) {
            dataModal.style.display = 'none';
        }
    });
}
