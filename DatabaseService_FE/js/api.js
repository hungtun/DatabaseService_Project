// API Service - Xử lý tất cả các request đến backend

class ApiService {
    constructor() {
        this.token = localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    // Lấy token từ localStorage
    getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    // Lưu token
    setToken(token) {
        this.token = token;
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
    }

    // Xóa token (đăng xuất)
    clearToken() {
        this.token = null;
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
    }

    // Lưu thông tin user
    setUser(user) {
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }

    // Lấy thông tin user
    getUser() {
        const userStr = localStorage.getItem(CONFIG.USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Gọi API với authentication
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Xử lý response rỗng (như 204 NoContent)
            if (response.status === 204 || response.status === 201) {
                return null;
            }

            // Kiểm tra content-type trước khi parse JSON
            const contentType = response.headers.get('content-type');
            let data = null;

            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (text && text.trim()) {
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        throw new Error(`Lỗi parse JSON: ${parseError.message}. Response: ${text.substring(0, 200)}`);
                    }
                }
            } else {
                // Nếu không phải JSON, lấy text
                const text = await response.text();
                if (text) {
                    throw new Error(`Server trả về không phải JSON. Response: ${text.substring(0, 200)}`);
                }
            }

            if (!response.ok) {
                throw new Error(data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Vui lòng thử lại.');
            }
            if (error.message) {
                throw error;
            }
            throw new Error(`Lỗi kết nối: ${error.message || 'Không thể kết nối đến server'}`);
        }
    }

    // Authentication APIs
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success && response.token) {
            this.setToken(response.token);
        }

        return response;
    }

    async register(username, password) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success && response.token) {
            this.setToken(response.token);
        }

        return response;
    }

    // Database Provision APIs
    async provisionDatabase(preferredName = null) {
        return this.request('/provision', {
            method: 'POST',
            body: JSON.stringify({ preferredName })
        });
    }

    async getDatabases() {
        return this.request('/provision');
    }

    async getDatabase(id) {
        return this.request(`/provision/${id}`);
    }

    async deleteDatabase(id) {
        const result = await this.request(`/provision/${id}`, { method: 'DELETE' });
        // DELETE trả về 204 NoContent, không có body
        return result !== null ? result : { success: true };
    }

    // Database Explorer APIs
    async getTables(databaseId) {
        // GET api/databases/{databaseId}/tables
        return this.request(`/databases/${encodeURIComponent(databaseId)}/tables`);
    }

    async getTableStructure(databaseId, tableName) {
        // GET api/databases/{databaseId}/tables/{tableName}/columns
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableName)}/columns`
        );
    }

    async getTableData(databaseId, tableName, page = 1, pageSize = 100) {
        // GET api/databases/{databaseId}/data/tables/{tableName}?page=&pageSize=
        const query = `?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`;
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/data/tables/${encodeURIComponent(tableName)}${query}`
        );
    }

    async createTable(databaseId, payload) {
        // POST api/databases/{databaseId}/tables
        return this.request(`/databases/${encodeURIComponent(databaseId)}/tables`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async dropTable(databaseId, tableName) {
        // DELETE api/databases/{databaseId}/tables/{tableName}
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableName)}`,
            { method: 'DELETE' }
        );
    }

    async getColumns(databaseId, tableName) {
        // GET api/databases/{databaseId}/tables/{tableName}/columns
        return this.getTableStructure(databaseId, tableName);
    }

    async addColumn(databaseId, tableName, payload) {
        // POST api/databases/{databaseId}/tables/{tableName}/columns
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableName)}/columns`,
            {
                method: 'POST',
                body: JSON.stringify(payload)
            }
        );
    }

    async modifyColumn(databaseId, tableName, payload) {
        // PUT api/databases/{databaseId}/tables/{tableName}/columns
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableName)}/columns`,
            {
                method: 'PUT',
                body: JSON.stringify(payload)
            }
        );
    }

    async dropColumn(databaseId, tableName, columnName) {
        // DELETE api/databases/{databaseId}/tables/{tableName}/columns/{columnName}
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableName)}/columns/${encodeURIComponent(columnName)}`,
            { method: 'DELETE' }
        );
    }

    async insertData(databaseId, payload) {
        // POST api/databases/{databaseId}/data/insert
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/data/insert`,
            {
                method: 'POST',
                body: JSON.stringify(payload)
            }
        );
    }

    async updateData(databaseId, payload) {
        // PUT api/databases/{databaseId}/data/update
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/data/update`,
            {
                method: 'PUT',
                body: JSON.stringify(payload)
            }
        );
    }

    async deleteData(databaseId, payload) {
        // DELETE api/databases/{databaseId}/data/delete
        return this.request(
            `/databases/${encodeURIComponent(databaseId)}/data/delete`,
            {
                method: 'DELETE',
                body: JSON.stringify(payload)
            }
        );
    }
}

const apiService = new ApiService();

