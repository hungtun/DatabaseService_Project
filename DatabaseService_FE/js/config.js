// Cấu hình ứng dụng
const CONFIG = {
  // URL backend API - Sử dụng relative path, FE server sẽ proxy đến BE
  API_BASE_URL: "/api",

  // Thời gian timeout cho request (ms)
  REQUEST_TIMEOUT: 30000,

  // Giới hạn số dòng kết quả query mặc định
  QUERY_RESULT_LIMIT: 1000,

  // Thời gian hiển thị thông báo (ms)
  NOTIFICATION_DURATION: 3000,

  // Tên key lưu token trong localStorage
  TOKEN_KEY: "db_service_token",

  // Tên key lưu user info trong localStorage
  USER_KEY: "db_service_user",

  // Định dạng ngày tháng
  DATE_FORMAT: "DD/MM/YYYY HH:mm:ss",
};
