# 🎮 Game Đoán Số Bí Mật (Bulls and Cows) - Realtime Multiplayer & AI Battle

Chào mừng bạn đến với dự án **Game Đoán Số Bí Mật (Bulls and Cows)**, một trò chơi trí tuệ kịch tính, kết hợp giữa lối chơi cổ điển và công nghệ hiện đại. Dự án hỗ trợ cả chế độ chơi trực tuyến nhiều người chơi (Realtime Multiplayer) lẫn chơi đơn với máy tính (AI Bot) với 3 cấp độ khó khác nhau.

---

## 🌟 Tính Năng Nổi Bật

### 1. ⚔️ Chế độ Chơi trực tuyến (Realtime Multiplayer)
* Kết nối người chơi thời gian thực qua **Socket.IO**.
* Tự động hoặc tạo phòng chờ ngẫu nhiên bằng mã phòng 6 chữ số (`G-XXXXXX`).
* Quyết định lượt đi trước bằng trò chơi **Oẳn Tù Tì (RPS)** ngay trên màn hình.
* Thiết lập mã bảo mật 4 chữ số (đảm bảo không trùng nhau) của mỗi người chơi.
* Giao diện nhắn tin trực tiếp trong phòng đấu thời gian thực.

### 2. 🤖 Chế độ Chơi với Máy (AI Bot)
Bot được tích hợp thuật toán AI Solver thông minh với 3 mức độ khó:
* **Dễ (Easy)**: Bot đoán hoàn toàn ngẫu nhiên và loại bỏ các số đã đoán trước đó.
* **Trung bình (Medium)**: Sử dụng phương pháp **Loại trừ logic (Deductive Elimination)** kết hợp thống kê **Tần suất chữ số xuất hiện nhiều nhất (Digit Frequency Heuristic)** để đưa ra nước đi tối ưu thông tin nhất.
* **Cực khó (Hard/Minimax)**: Sử dụng thuật toán tối ưu toán học **Minimax** để chia nhỏ các khả năng tối đa, cam kết giải mã thành công trong **tối đa 5 lượt** cho dù mật mã của người chơi có hiểm hóc đến mấy.

### 3. 🔒 Bảo mật Chống Gian lận (Anti-Cheating Cryptography)
* Mật mã bí mật của người chơi được mã hóa bảo mật bằng thuật toán **AES-256-GCM** trên backend trước khi lưu trữ vào RAM/Redis.
* Bot AI và người chơi khác hoàn toàn không có khả năng đọc trộm mật mã. Việc so khớp (🟢 số trúng & 🎯 đúng vị trí) chỉ diễn ra ở backend và trả về số lượng chính xác về client.

### 4. 📊 Lưu Trữ Lịch Sử & Bảng Xếp Hạng
* Kết nối cơ sở dữ liệu **MongoDB Atlas** để lưu trữ tất cả lịch sử đấu của người chơi.
* Bảng xếp hạng cập nhật thời gian thực dựa trên các chỉ số thắng/thua, tỷ lệ thắng và chuỗi thắng liên tục.

### 5. 🎨 Giao Diện Đẹp Mắt & Trải Nghiệm Mượt Mà
* Thiết kế theo phong cách tối **Premium Dark Mode** kết hợp các hiệu ứng Glassmorphism.
* Hoạt ảnh mở/đóng cửa sổ, lướt màn hình mượt mà 60fps nhờ **Framer Motion** và tăng tốc phần cứng **GPU (`transform-gpu`)**.
* Hỗ trợ đa ngôn ngữ hoàn hảo: **Tiếng Việt 🇻🇳** và **Tiếng Anh 🇬🇧**.
* Hiển thị tối ưu, co giãn thông minh trên cả thiết bị di động (Mobile) lẫn máy tính (Desktop).

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend
* **Framework**: Next.js 16 (App Router, Turbopack)
* **Ngôn ngữ**: TypeScript & React 19
* **CSS & Styling**: TailwindCSS (Phiên bản v4 mới nhất)
* **Animation**: Framer Motion (GPU Accelerated)
* **Icons**: Lucide React
* **Realtime Connection**: Socket.IO Client

### Backend
* **Runtime**: Node.js & Express
* **Database**: MongoDB (qua Mongoose ODM) & Upstash Redis (lưu trữ đồng bộ trạng thái phòng chờ tạm thời tránh mất dữ liệu khi restart)
* **Realtime Communication**: Socket.IO Server
* **Security**: JSON Web Token (JWT) & Crypto (AES-256-GCM)

### Infrastructure & Deployment
* **Containerization**: Docker (Multi-stage build)
* **Reverse Proxy**: Caddy (Quản lý routing, tự động hóa HTTPs)
* **Cloud Platform**: Fly.io (hoặc Dokploy/Render)

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
game-en-website/
├── backend/                  # MÃ NGUỒN BACKEND
│   ├── models/
│   │   └── GameHistory.js    # Schema Mongoose lưu lịch sử trận đấu
│   ├── aiSolver.js           # Thuật toán trí tuệ nhân tạo (Easy, Medium, Minimax)
│   ├── server.js             # API chính và Socket.IO Server điều phối phòng game
│   └── package.json
│
├── frontend/                 # MÃ NGUỒN FRONTEND (NEXT.JS)
│   ├── src/
│   │   ├── app/              # Routing chính của App Router
│   │   │   ├── history/      # Trang tra cứu lịch sử đấu của bạn
│   │   │   ├── leaderboard/  # Trang Bảng xếp hạng người chơi
│   │   │   └── layout.tsx & page.tsx
│   │   │
│   │   └── features/game/    # Các component chia tách mô-đun game
│   │       ├── components/   # Các Component UI con (Chat, Lịch sử, Bảng kết quả...)
│   │       ├── hooks/        # React Hooks quản lý kết nối socket và trạng thái game
│   │       ├── i18n.ts       # Từ điển đa ngôn ngữ tiếng Anh/tiếng Việt
│   │       ├── types.ts      # Khai báo kiểu TypeScript
│   │       └── GameClient.tsx # Component điều phối tổng của giao diện game
│   └── package.json
│
├── Caddyfile                 # Cấu hình định tuyến Reverse Proxy trong Docker
├── Dockerfile                # File build Docker 3 giai đoạn (Frontend, Backend, Production)
├── start.sh                  # Kịch bản khởi động song song Frontend & Backend
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt và Chạy Local

### Yêu Cầu Hệ Thống
* Node.js v18 hoặc mới hơn
* MongoDB (Chạy cục bộ hoặc MongoDB Atlas)
* Redis (Chạy cục bộ hoặc Upstash Redis cloud)

---

### Bước 1: Thiết Lập Backend
1. Truy cập vào thư mục backend:
   ```bash
   cd backend
   ```
2. Cài đặt các gói thư viện:
   ```bash
   npm install
   ```
3. Tạo file cấu hình môi trường `.env` trong thư mục `backend/` với nội dung mẫu sau:
   ```env
   PORT=8080
   JWT_SECRET=your_jwt_secret_key_here
   GAME_SECRET_KEY=32_bytes_hex_string_here_for_aes_encryption
   MONGO_URI=mongodb://localhost:27017/number-guessing-game
   UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url
   UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
   MOVIE_API_URL=http://localhost:3001/api
   ```
4. Khởi động server backend ở chế độ phát triển (Development):
   ```bash
   npm run dev
   ```

---

### Bước 2: Thiết Lập Frontend
1. Truy cập vào thư mục frontend:
   ```bash
   cd ../frontend
   ```
2. Cài đặt các gói thư viện:
   ```bash
   npm install
   ```
3. Khởi động Next.js ở chế độ phát triển trên cổng `3002`:
   ```bash
   npm run dev
   ```
4. Truy cập trình duyệt tại địa chỉ: `http://localhost:3002`

---

## 🐳 Vận Hành Trong Môi Trường Production (Docker & Caddy)

Trong môi trường máy chủ Production, dự án chạy thông qua **Docker** và định tuyến cổng bằng **Caddy** để bảo mật và tối đa hóa tốc độ tải trang.

1. **Docker Multi-stage Build**:
   * **Giai đoạn 1**: Build biên dịch code Next.js sang static và server-side tối ưu.
   * **Giai đoạn 2**: Cài đặt gói thư viện Node.js production cho backend.
   * **Giai đoạn 3 (Final)**: Copy file đã build, khởi động cả 2 dịch vụ song song và chạy Caddy trên cổng `8080` làm cổng duy nhất ra ngoài.

2. **Quy tắc định tuyến của Caddy (Caddyfile)**:
   ```caddy
   :8080 {
       reverse_proxy /socket.io/* localhost:3003
       reverse_proxy /api/* localhost:3003
       reverse_proxy /* localhost:3002
   }
   ```
   * Luồng Socket.IO và API backend được định tuyến sang cổng backend (`3003`).
   * Các trang tĩnh và tài nguyên frontend được định tuyến về Next.js (`3002`).

---

Chúc các bạn có những giây phút trải nghiệm đấu trí kịch tính và thú vị cùng **Bulls and Cows Game**! 🏆
