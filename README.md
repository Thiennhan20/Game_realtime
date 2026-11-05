# 🎮 Game Đoán Số Bí Mật (Bulls and Cows) — Realtime Multiplayer & AI Battle Arena

<div align="center">

<img src="https://img.shields.io/badge/Next.js-16.2.7-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
<img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
<img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
<img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
<img src="https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
<img src="https://img.shields.io/badge/Web_Audio_API-Synthesizer-orange?style=for-the-badge" alt="Web Audio" />

<br />

**Đấu trường trí tuệ đối kháng trực tuyến dựa trên luật chơi số học kinh điển Bulls and Cows (Đoán số 4 chữ số bí mật).**

**Hỗ trợ Ghép trận PvP Thời gian thực, Đấu trí AI Solver Minimax, Khán giả trực tiếp, Bảng xếp hạng Elo Esports, Hệ thống Danh hiệu & Thành tựu.**

<br />

</div>

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 1. ⚔️ Chế Độ Đối Kháng Thời Gian Thực (Realtime PvP)
* **Kết nối siêu tốc qua Socket.IO**: Độ trễ cực thấp, phản hồi trạng thái lượt đi ngay tức thì.
* **Ghép trận thông minh (Quick Match)**: Tìm kiếm đối thủ tự động; tự động chuyển sang Bot AI nếu phòng chờ quá thời gian.
* **Tạo & Gia nhập phòng riêng (`G-XXXXXX`)**: Chia sẻ mã phòng ngắn gọn, dễ dàng mời bạn bè cùng chơi.
* **Mini-game Oẳn Tù Tì (RPS Phase)**: Quyết định quyền đoán trước một cách công bằng và kịch tính ngay đầu trận.
* **Thiết lập mật mã bí mật 4 chữ số**: Bàn phím số tương tác chống nhập trùng, mã hóa an toàn trước khi lưu trữ.
* **Âm thanh chuông báo ("Ting 🔔") & Rung Haptic**: Chuông ngân 3 tầng Web Audio API phát ngay khi đối thủ khóa mật mã hoặc chọn xong nước oẳn tù tì.
* **Hiệu ứng Pháo hoa ăn mừng (Confetti 🎉)**: Bung pháo hoa chúc mừng rực rỡ khi Chiến thắng (`isWinner`) hoặc Thăng hạng Rank (`isRankUp`), tối ưu 0% CPU khi kết thúc.
* **Tương tác cảm xúc (Floating Emotes)**: Thả biểu tượng cảm xúc trôi nổi sinh động ngay quanh avatar người chơi (`direction="down"` chống tràn màn hình).
* **Cơ chế ân hạn mất kết nối 60s (Reconnect Grace Period)**: Giữ nguyên trạng thái phòng khi người chơi tải lại trang hoặc rớt mạng tạm thời.

---

### 2. 🤖 Đấu Trí Với Máy Tính (AI Bot Battle)
Tích hợp 3 cấp độ trí tuệ nhân tạo độc lập:
* **Dễ (Easy)**: Bot đoán ngẫu nhiên trong tập hợp các số hợp lệ, loại trừ các số đã đoán trước.
* **Trung bình (Medium)**: Sử dụng phương pháp **Loại trừ logic (Deductive Elimination)** kết hợp thống kê **Tần suất chữ số xuất hiện nhiều nhất (Digit Frequency Heuristic)**.
* **Cực khó (Hard / Minimax Solver)**: Thuật toán toán học **Minimax**, tối ưu hóa thông tin thu nhận ở mỗi lượt, cam kết giải mã thành công trong **tối đa 5 lượt đoán**.

---

### 3. 👁️ Chế Độ Khán Giả Trực Tiếp (Spectator Mode)
* Cho phép người chơi khác tham gia vào phòng đấu đang diễn ra để theo dõi trực tiếp diễn biến.
* Giới hạn tối đa **10 khán giả/phòng** bảo đảm hiệu năng máy chủ.
* Khán giả có huy hiệu riêng, theo dõi được lượt đoán công khai của 2 đấu thủ mà không làm lộ mật mã bí mật.

---

### 4. 🏆 Hệ Thống Elo Rating & Bậc Rank Esports
* Công thức tính điểm **Elo Rating chuẩn quốc tế**: Điểm số cộng/trừ phụ thuộc chính xác vào tương quan chênh lệch elo giữa 2 người chơi.
* **Hệ thống 6 Bậc Rank**:
  $$\text{Đồng (Bronze)} \rightarrow \text{Bạc (Silver)} \rightarrow \text{Vàng (Gold)} \rightarrow \text{Bạch Kim (Platinum)} \rightarrow \text{Kim Cương (Diamond)} \rightarrow \text{Cao Thủ (Master)}$$
* Thống kê toàn diện: Tổng số trận, Tỷ lệ thắng (Win Rate), Chuỗi thắng dài nhất, Lịch sử đối đầu.

---

### 5. 🎖️ Hệ Thống Cấp Độ (XP), Danh Hiệu & Thành Tựu
* **Điểm kinh nghiệm (XP)**: Nhận thưởng XP sau mỗi trận đấu hợp lệ để thăng cấp hồ sơ.
* **Mở khóa Thành tựu (Achievements)**: Vinh danh các mốc chiến tích (Thắng chuỗi 5 trận, Đoán trúng trong 3 lượt, Đánh bại Bot Hard...).
* **Hệ thống Danh hiệu (Equippable Titles)**: Trang bị danh hiệu độc quyền hiển thị nổi bật cạnh tên người chơi trên sảnh và trong phòng đấu.

---

### 6. 📱 Giao Diện Mobile-First & Chế Độ Nhúng (Embedded Iframe)
* **Bàn phím cơ số ảo (Touch NumberPad Modal)**: Thiết kế công thái học cho điện thoại di động, tự động vô hiệu hóa các số đã chọn hoặc đã nhập.
* **Xem lịch sử đối đầu (Guess History Modal)**: Đối chiếu song song bảng đoán và manh mối (Trúng / Đúng vị trí) của cả hai đấu thủ.
* **Tích hợp Nhúng vào Website chính (`client-en-website/game-realtime`)**:
  * Tự động nhận diện query `embedded=1`.
  * Giao tiếp an toàn 2 chiều qua `postMessage` (đồng bộ Token JWT, Avatar, Username).
  * Khắc phục triệt để lỗi Hydration Mismatch giữa SSR và Client.
* **Hỗ trợ Song ngữ**: Chuyển đổi linh hoạt Tiếng Việt / Tiếng Anh (`vi` / `en`).

---

### 7. 🔒 Bảo Mật & Độ Tin Cậy Dữ Liệu
* **Mã hóa AES-256-GCM**: Mật mã người chơi được mã hóa đối xứng trước khi đồng bộ lên RAM hoặc Redis, chống việc đọc trộm mật mã qua mạng hoặc debug.
* **Upstash Redis Cache**: Lưu trữ trạng thái phòng đấu tạm thời, hỗ trợ khôi phục phiên chơi ngay cả khi backend khởi động lại.
* **Bộ ngắt mạch (Circuit Breaker)**: Bảo vệ hệ thống khi dịch vụ hồ sơ người dùng bên ngoài bị gián đoạn.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Frontend
* **Framework**: Next.js 16.2.7 (App Router, Turbopack)
* **Thư viện UI**: React 19.2.4 & Tailwind CSS v4
* **Biểu tượng**: Lucide React
* **Hiệu ứng**: Framer Motion 12
* **Âm thanh**: Web Audio API Synthesizer (Không tốn băng thông tải file mp3)
* **Realtime**: Socket.IO Client 4.8.3

### Backend
* **Nền tảng**: Node.js & Express 4.21
* **Realtime Server**: Socket.IO 4.8.1
* **Cơ sở dữ liệu**: MongoDB (Mongoose 9.7) & Upstash Redis REST
* **Bảo mật**: JSON Web Token (JWT), Crypto AES-256-GCM
* **Kiểm thử**: Node.js Native Test Runner (`node --test`), **40 unit tests** kiểm tra toàn bộ luồng nghiệp vụ.

---

## 📁 Cấu Trúc Thư Mục (Project Structure)

```text
game-en-website/
├── backend/                       # MÃ NGUỒN BACKEND
│   ├── config/                    # Cấu hình Redis & biến môi trường
│   ├── models/                    # Mongoose Models (GameHistory, GameProfile, User)
│   ├── routes/                    # REST APIs (api.js, health.js)
│   ├── services/                  # Business Logic:
│   │   ├── RoomManager.js         # Quản lý vòng đời phòng đấu & người chơi
│   │   ├── MatchSettlementService.js # Tính toán Elo, XP, Thành tựu & Danh hiệu
│   │   ├── AiSolverService.js     # Thuật toán giải mã Minimax & Heuristic
│   │   └── AchievementService.js  # Hệ thống thành tích
│   ├── socket/                    # Socket.IO Event Handlers & Middleware Auth
│   ├── tests/                     # 40 Unit Tests tự động
│   ├── utils/                     # Mã hóa AES-256-GCM, logic tính Bulls/Cows
│   ├── server.js                  # Khởi động Backend Server
│   └── package.json
│
├── frontend/                      # MÃ NGUỒN FRONTEND
│   ├── src/
│   │   ├── app/                   # Next.js Pages (/, /history, /leaderboard, /achievements)
│   │   └── features/game/         # Mô-đun Game Logic & Components
│   │       ├── components/
│   │       │   ├── common/        # ConfettiCanvas, EquippedTitleBadge
│   │       │   ├── lobby/         # Danh sách phòng, Phân trang, Bộ lọc
│   │       │   ├── modals/        # NumberPad, GuessHistory, MatchSummary, StartCountdown
│   │       │   ├── room/          # ActiveRoom, PlayingArena, RpsDecision, SecretSetup...
│   │       │   └── chat/          # Khung chat & Floating Emote Overlay
│   │       ├── hooks/             # useGameController, useGameProfile, useLocale
│   │       ├── sound.ts           # Web Audio API Synthesizer (Ting, Click, Fanfare, Win/Lose)
│   │       ├── i18n.ts            # Bộ từ điển song ngữ Tiếng Việt & Tiếng Anh
│   │       └── types.ts           # TypeScript interfaces & types
│   └── package.json
│
├── Caddyfile                      # Cấu hình Caddy Reverse Proxy
├── Dockerfile                     # Docker Multi-stage build
├── start.sh                       # Script chạy production trong container
├── package.json                   # Script điều phối chung
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt và Khởi Chạy

### 1. Yêu cầu môi trường
* **Node.js**: v18+ (khuyên dùng Node.js 20 LTS trở lên)
* **MongoDB**: v6.0+ (Local hoặc MongoDB Atlas)
* **Redis**: Upstash Redis REST credentials (hoặc Redis server)

---

### 2. Cài đặt Dependencies

Tại thư mục gốc `game-en-website/`:

```bash
# Cài đặt toàn bộ dependencies cho cả root, backend và frontend
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

### 3. Cấu hình biến môi trường (`backend/.env`)

Tạo file `backend/.env` với nội dung:

```env
PORT=8080
JWT_SECRET=your_super_secret_jwt_key
GAME_SECRET_KEY=32_bytes_hex_string_for_aes_encryption
MONGO_URI=mongodb://localhost:27017/number-guessing-game
UPSTASH_REDIS_REST_URL=https://your-upstash-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
MOVIE_API_URL=http://localhost:5000/api
```

---

### 4. Các lệnh phát triển & kiểm thử

| Lệnh (chạy tại thư mục gốc) | Chức năng |
| :--- | :--- |
| `npm run dev` | Chạy đồng thời **Backend (`:8080`)** và **Frontend (`:3002`)** |
| `npm test` | Thực thi bộ **40 Unit Tests** kiểm thử toàn diện logic trò chơi |
| `npm run build` | Kiểm tra cú pháp Backend và Build tối ưu Frontend Next.js Turbopack |
| `npm run build:frontend` | Build riêng mã nguồn Frontend Next.js |
| `npm run build:backend` | Kiểm tra cú pháp Backend (`node --check server.js`) |

---

### 5. Truy cập ứng dụng

* **Giao diện Game**: [http://localhost:3002](http://localhost:3002)
* **Health Check API**: [http://localhost:8080/health](http://localhost:8080/health)
* **Trạng thái phòng đấu**: [http://localhost:8080/api/rooms](http://localhost:8080/api/rooms)

---

## 🐳 Triển Khai Production (Docker & Caddy)

Dự án đi kèm Dockerfile và cấu hình Caddy tự động định tuyến:

```bash
# Build Docker image
docker build -t game-guessing-arena .

# Khởi chạy container với biến môi trường
docker run -p 8080:8080 --env-file backend/.env game-guessing-arena
```

**Cơ chế định tuyến của Caddy:**
* Mọi yêu cầu `/socket.io/*` và `/api/*` được chuyển hướng vào Node.js Backend.
* Toàn bộ trang giao diện Next.js được phục vụ mượt mà qua port nội bộ.

---

<div align="center">

**Bulls and Cows Arena — Trải nghiệm đấu trí số học đỉnh cao! 🏆**

</div>
