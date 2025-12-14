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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Vui lòng thử lại.');
            }
            throw error;
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
        // TODO: Cần thêm endpoint này vào backend
        // return this.request('/provision');
        throw new Error('Endpoint chưa được triển khai');
    }

    async getDatabase(id) {
        // TODO: Cần thêm endpoint này vào backend
        // return this.request(`/provision/${id}`);
        throw new Error('Endpoint chưa được triển khai');
    }

    async deleteDatabase(id) {
        // TODO: Cần thêm endpoint này vào backend
        // return this.request(`/provision/${id}`, { method: 'DELETE' });
        throw new Error('Endpoint chưa được triển khai');
    }

    // Query APIs
    async executeQuery(databaseName, query) {
        // TODO: Cần thêm endpoint này vào backend
        // return this.request('/query', {
        //     method: 'POST',
        //     body: JSON.stringify({ databaseName, query })
        // });
        throw new Error('Endpoint chưa được triển khai');
    }

    async getTables(databaseName) {
        // TODO: Cần thêm endpoint này vào backend
        // return this.request(`/provision/${databaseName}/tables`);
        throw new Error('Endpoint chưa được triển khai');
    }

    async getTableStructure(databaseName, tableName) {
        // TODO: Cần thêm endpoint này vào backend
        // return this.request(`/provision/${databaseName}/tables/${tableName}/structure`);
        throw new Error('Endpoint chưa được triển khai');
    }

    async getTableData(databaseName, tableName, page = 1, limit = 100) {
        // TODO: Cần thêm endpoint này vào backend
        // return this.request(`/provision/${databaseName}/tables/${tableName}/data?page=${page}&limit=${limit}`);
        throw new Error('Endpoint chưa được triển khai');
    }
}

const apiService = new ApiService();

