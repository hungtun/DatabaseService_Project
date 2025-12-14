# DatabaseService_Project# DatabaseService - Hướng dẫn Setup

## Yêu cầu hệ thống

1. **.NET 8.0 SDK** - Tải từ: https://dotnet.microsoft.com/download/dotnet/8.0
2. **MySQL Server 8.0+** - Đảm bảo MySQL đang chạy
3. **dotnet-ef tool** - Tool để chạy migrations

## Các bước setup

### 1. Kiểm tra .NET SDK

```bash
dotnet --version
# Phải hiển thị version 8.x.x
```

### 2. Cài đặt dotnet-ef tool (QUAN TRỌNG)

```bash
dotnet tool install -g dotnet-ef
```

Sau khi cài, kiểm tra lại:

```bash
dotnet ef --version
```

**Lưu ý**: Nếu trên Windows, có thể cần thêm vào PATH:

```bash
# Thêm vào PATH (Windows)
$env:Path += ";$env:USERPROFILE\.dotnet\tools"
```

### 3. Cấu hình MySQL Connection String

Sửa file `API/appsettings.json` và `API/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=cloud_db;User=root;Password=YOUR_PASSWORD;TreatTinyAsBoolean=false;CharSet=utf8mb4;",
    "AdminConnection": "Server=localhost;Port=3306;Database=cloud_db;User=root;Password=YOUR_PASSWORD;TreatTinyAsBoolean=false;CharSet=utf8mb4;"
  }
}
```

**Thay `YOUR_PASSWORD` bằng mật khẩu MySQL của bạn.**

### 4. Tạo database MySQL (nếu chưa có)

```sql
CREATE DATABASE cloud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Restore NuGet packages

```bash
cd DatabaseService_BE
dotnet restore
```

### 6. Chạy migrations để tạo bảng

```bash
dotnet ef database update --project Persistence --startup-project API
```

### 7. Build project

```bash
dotnet build
```

### 8. Chạy ứng dụng

```bash
cd API
dotnet run
```

Hoặc:

```bash
dotnet run --project API
```

### 9. Kiểm tra

- API chạy tại: `https://localhost:5001` hoặc `http://localhost:5000`
- Swagger UI: `https://localhost:5001/swagger` (trong môi trường Development)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký tài khoản

  ```json
  {
    "username": "testuser",
    "password": "password123"
  }
  ```

- `POST /api/auth/login` - Đăng nhập
  ```json
  {
    "username": "testuser",
    "password": "password123"
  }
  ```
  Response trả về JWT token

### Database Provisioning (Cần JWT token)

- `POST /api/provision` - Tạo database mới
  ```json
  {
    "preferredName": "mydb"
  }
  ```
  Header: `Authorization: Bearer {JWT_TOKEN}`

## Cấu trúc project

```
DatabaseService_BE/
├── Domain/
│   ├── Entities/
│   │   ├── User.cs
│   │   └── ProvisionedDatabase.cs
│   └── Interfaces/
│       ├── IUserRepository.cs
│       └── IProvisionedDatabaseRepository.cs
├── Application/
│   ├── Services/
│   │   ├── AuthService.cs
│   │   └── ProvisionService.cs
│   ├── DTOs/
│   └── Options/
│       └── JwtOptions.cs
├── Persistence/
│   ├── EF/
│   │   └── AppDbContext.cs
│   └── Repositories/
│       ├── UserRepository.cs
│       └── ProvisionedDatabaseRepository.cs
└── API/
    ├── Controllers/
    │   ├── AuthController.cs
    │   └── ProvisionController.cs
    └── Program.cs
```

## Troubleshooting

### Lỗi: "dotnet-ef does not exist"

**Giải pháp**: Cài đặt tool:

```bash
dotnet tool install -g dotnet-ef
```

### Lỗi: "Could not connect to MySQL"

**Giải pháp**:

- Kiểm tra MySQL đang chạy
- Kiểm tra connection string trong appsettings.json
- Đảm bảo database `cloud_db` đã được tạo

### Lỗi: "Access denied for user"

**Giải pháp**:

- Kiểm tra username/password trong connection string
- Đảm bảo MySQL user có quyền `CREATE DATABASE`, `CREATE USER`, `GRANT`

### Lỗi: "Migration already applied"

**Giải pháp**:

- Kiểm tra bảng `__EFMigrationsHistory` trong database
- Nếu cần reset, xóa database và chạy lại migrations

## Lưu ý bảo mật

1. **JWT Secret**: Đổi `Jwt:Secret` trong appsettings.json cho production
2. **MySQL Password**: Không commit password vào git
3. **AdminConnection**: Tài khoản MySQL cần có quyền admin để tạo database/user
