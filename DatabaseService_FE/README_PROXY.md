# Frontend Proxy Server Setup

## Mô tả

Frontend server sử dụng Node.js + Express để:

1. Serve static files (HTML, CSS, JS)
2. Proxy API requests từ browser đến Backend EC2 Private

## Cài đặt

### 1. Cài đặt Node.js trên EC2 Public

```bash
# Update system
sudo apt update

# Cài đặt Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra version
node --version
npm --version
```

### 2. Cài đặt dependencies

```bash
cd ~/DatabaseService_Project/DatabaseService_FE
npm install
```

### 3. Chạy server

```bash
# Chạy trực tiếp
node server.js

# Hoặc
npm start
```

Server sẽ chạy trên port 5500.

## Cấu hình systemd service (Production)

Tạo service file để tự động chạy khi boot:

```bash
sudo nano /etc/systemd/system/database-service-frontend.service
```

Nội dung:

```ini
[Unit]
Description=Database Service Frontend Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/DatabaseService_Project/DatabaseService_FE
ExecStart=/usr/bin/node /home/ubuntu/DatabaseService_Project/DatabaseService_FE/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5500

[Install]
WantedBy=multi-user.target
```

Kích hoạt service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable database-service-frontend

# Start service
sudo systemctl start database-service-frontend

# Kiểm tra status
sudo systemctl status database-service-frontend

# Xem logs
sudo journalctl -u database-service-frontend -f
```

## Cấu hình

### Thay đổi Backend URL

Sửa file `server.js`:

```javascript
const BACKEND_URL = "http://10.0.4.123:5003"; // Private IP of BE EC2
```

### Thay đổi Port

Sửa file `server.js`:

```javascript
const PORT = 5500; // Hoặc port khác
```

## Kiểm tra

1. Truy cập: `http://13.222.108.167:5500`
2. Mở DevTools (F12) → Network tab
3. Thử đăng nhập/đăng ký
4. Kiểm tra requests đến `/api/*` có được proxy không

## Troubleshooting

### Lỗi: "Cannot find module 'express'"

```bash
npm install
```

### Lỗi: "Port already in use"

```bash
# Tìm process đang dùng port
sudo lsof -i :5500
# Kill process
sudo kill -9 <PID>
```

### Lỗi: "Cannot connect to backend"

- Kiểm tra BE có đang chạy không: `curl http://10.0.4.123:5003/api/auth/register`
- Kiểm tra Security Group của BE đã mở port 5003 cho FE EC2 chưa
- Kiểm tra firewall trên BE EC2

## Logs

Xem logs của proxy server:

```bash
# Nếu chạy trực tiếp
# Logs sẽ hiển thị trên console

# Nếu dùng systemd
sudo journalctl -u database-service-frontend -f
```
