# 🎮 Game Đoán Số Bí Mật (Bulls and Cows) - Realtime Multiplayer & AI Battle

Chào mừng bạn đến với dự án **Game Đoán Số Bí Mật (Bulls and Cows)**, một trò chơi trí tuệ kịch tính kết hợp giữa luật chơi đối kháng số học cổ điển và công nghệ web thời gian thực hiện đại. Dự án hỗ trợ cả chế độ chơi trực tuyến nhiều người chơi (Realtime Multiplayer) lẫn đấu trí với máy tính (AI Bot) qua 3 cấp độ khó khác nhau, đi kèm hệ thống Elo Ranking, Thành tựu (Achievements), Cấp độ (XP) và Chế độ Khán giả (Spectator).

---

## 🌟 Tính Năng Nổi Bật

### 1. ⚔️ Chế độ Chơi Trực Tuyến (Realtime PvP)
* Kết nối người chơi thời gian thực với độ trễ cực thấp qua **Socket.IO**.
* Tự động ghép phòng hoặc tạo phòng riêng biệt bằng mã phòng ngắn gọn (`G-XXXXXX`).
* Quyết định quyền đoán trước bằng mini-game **Oẳn Tù Tì (RPS)** trực quan ngay trước khi trận đấu bắt đầu.
* Thiết lập mật mã 4 chữ số bí mật (0-9 không trùng lặp) với cơ chế bảo mật và giao diện bàn phím cơ chống trùng lặp.
* Giao diện **Esports Battle HUD** hiển thị trực quan thông tin đấu thủ, chuỗi thắng liên tiếp (`🔥 Win Streak`), huy hiệu VS kim loại và vòng hào quang trạng thái.
* Tự động xử lý ngắt kết nối tạm thời với thời gian ân hạn 60 giây (**60s Reconnect Grace Period**), chống mất trạng thái trận đấu.
* Hệ thống xử lý xử thua (**Forfeit**) và bỏ trận (**Abandoned**) công bằng và chuẩn xác.

### 2. 🤖 Đấu Trí Với Máy Tính (AI Bot Battle)
Tích hợp thuật toán giải mã AI Solver thông minh với 3 mức độ thử thách:
* **Dễ (Easy)**: Bot đoán ngẫu nhiên trong tập hợp hợp lệ và loại bỏ các số đã thử trước đó.
* **Trung bình (Medium)**: Sử dụng phương pháp **Loại trừ logic (Deductive Elimination)** kết hợp thống kê **Tần suất chữ số xuất hiện nhiều nhất (Digit Frequency Heuristic)** để tối đa hóa lượng thông tin thu được qua từng lượt.
* **Cực khó (Hard/Minimax)**: Thuật toán toán học **Minimax**, phân tích không gian trạng thái để thu hẹp nhanh nhất khả năng mật mã của người chơi, giải mã thành công trong **tối đa 5 lượt**.

### 3. 👁️ Chế Độ Khán Giả (Spectator Mode)
* Cho phép người chơi khác tham gia vào phòng đấu đang diễn ra để theo dõi trực tiếp lượt đoán của hai bên.
* Hỗ trợ tối đa **10 khán giả/phòng** để bảo đảm hiệu năng mạng và máy chủ.
* Khán giả có thể tham gia kênh chat thời gian thực với huy hiệu riêng biệt.

### 4. 🏆 Bảng Xếp Hạng Elo & Hệ Thống Bậc Rank
* Thuật toán tính điểm **Elo Rating** chuẩn Esports: điểm cộng/trừ phụ thuộc vào tương quan trình độ giữa hai đối thủ.
* Hệ thống bậc rank phong phú: **Đồng (Bronze) ➔ Bạc (Silver) ➔ Vàng (Gold) ➔ Bạch Kim (Platinum) ➔ Kim Cương (Diamond) ➔ Cao Thủ (Master)**.
* Compound Index MongoDB `{ rating: -1, wins: -1, losses: 1 }` giúp truy vấn Top Leaderboard siêu tốc.

### 5. 🎖️ Hệ Thống Cấp Độ (XP) & Thành Tựu (Achievements)
* Tích lũy điểm kinh nghiệm (XP) sau mỗi trận đấu hợp lệ để thăng cấp (Level Progress).
* Mở khóa các danh hiệu và huy hiệu thành tựu vinh danh chiến tích PvP, chuỗi thắng và chiến thắng trước bot AI.

### 6. 🔒 Bảo Mật & Toàn Vẹn Dữ Liệu
* Mã hóa mật mã của người chơi bằng chuẩn công nghiệp **AES-256-GCM** trước khi đồng bộ lên RAM hoặc Redis, chống gian lận đọc trộm mã từ bộ nhớ hay mạng.
* Xác thực người dùng qua JWT kèm bộ nhớ đệm profile và cơ chế ngắt mạch (**Circuit Breaker**) bảo vệ server khi API tài khoản gặp sự cố.
* Đồng bộ trạng thái phòng đấu tạm thời qua **Upstash Redis** giúp duy trì phiên đấu ổn định ngay cả khi backend khởi động lại.

### 7. 🎨 Giao Diện Cyber Gaming & Trải Nghiệm Mượt Mà
* Phong cách **Cyber Esports Dark Mode** tối ưu màn hình OLED (`#07080d`) với chiều sâu ánh sáng tỏa mờ `radial-gradient`.
* Giao diện thích ứng linh hoạt (**Mobile-First & Cross-Device Responsive**) từ màn hình nhỏ 320px đến màn hình 4K.
* Hệ thống âm thanh tổng hợp đa tầng (**Web Audio API Synthesizer**) 100% client-side: không tốn băng thông tải file audio, phản hồi tức thì với từng phím bấm, khóa két sắt và khai trận.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend
* **Framework**: Next.js 16 (App Router, Turbopack)
* **Ngôn ngữ**: TypeScript & React 19
* **CSS & Styling**: TailwindCSS (Phiên bản v4)
* **Icons**: Lucide React
* **Realtime Client**: Socket.IO Client
* **Audio Engine**: Web Audio API (Synthesizer không phụ thuộc file mp3 ngoài)

### Backend
* **Runtime**: Node.js & Express
* **Database**: MongoDB (Mongoose ODM) & Upstash Redis (quản lý room cache và reconnect)
* **Realtime Server**: Socket.IO Server
* **Security & Auth**: JSON Web Token (JWT), Crypto (AES-256-GCM)
* **Testing**: Node.js Test Runner tích hợp (`node --test`), 40 unit test kiểm thử toàn diện logic trận đấu, xếp hạng và tính điểm thưởng

### Infrastructure & Deployment
* **Containerization**: Docker (Multi-stage build)
* **Reverse Proxy**: Caddy (Quản lý routing, tự động hóa HTTPs)

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
game-en-website/
├── backend/                  # MÃ NGUỒN BACKEND (NODE.JS + EXPRESS + SOCKET.IO)
│   ├── config/               # Cấu hình Redis & biến môi trường
│   ├── models/               # Mongoose Schemas (GameHistory, GameProfile, User)
│   ├── routes/               # REST API endpoints (api.js, health.js)
│   ├── services/             # Nghiệp vụ: RoomManager, MatchSettlement, AI, Elo, XP...
│   ├── socket/               # Xử lý Socket.IO: xác thực và luồng phòng đấu
│   ├── tests/                # 40 Unit Tests kiểm thử toàn bộ logic nghiệp vụ
│   ├── utils/                # Mã hóa AES-256-GCM, logic tính Bulls/Cows, Elo
│   ├── server.js             # Điểm khởi động Backend Server
│   └── package.json
│
├── frontend/                 # MÃ NGUỒN FRONTEND (NEXT.JS APP ROUTER)
│   ├── src/
│   │   ├── app/              # Trang Next.js (/, /history, /leaderboard, /achievements)
│   │   └── features/game/    # Mô-đun Game logic & giao diện
│   │       ├── components/   # UI Components: Room, Chat, Lobby, Header, Modals...
│   │       ├── hooks/        # React Hooks quản lý controller, locale, profile
│   │       ├── sound.ts      # Web Audio Synthesizer phát âm thanh trực tiếp
│   │       ├── i18n.ts       # Từ điển đa ngôn ngữ (Tiếng Việt & Tiếng Anh)
│   │       └── types.ts      # Định nghĩa TypeScript Types
│   └── package.json
│
├── package.json              # Quản lý lệnh chạy chung cho cả Backend & Frontend
├── Dockerfile                # Docker Multi-stage build tối ưu cho production
├── Caddyfile                 # Cấu hình Caddy Reverse Proxy (Socket.IO, API, Next.js)
├── start.sh                  # Kịch bản khởi động production bên trong container
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt và Chạy

### 1. Yêu Cầu Môi Trường
* **Node.js**: v18 trở lên (khuyên dùng Node.js LTS v20+)
* **MongoDB**: Phiên bản 6.0+ (chạy local hoặc MongoDB Atlas)
* **Redis**: Upstash Redis REST URL & Token (hoặc Redis cục bộ)

---

### 2. Cài Đặt Ban Đầu

Tại thư mục gốc của dự án, cài đặt dependencies cho cả backend và frontend:

```bash
# Cài đặt gói thư viện ở thư mục gốc
npm install

# Cài đặt dependencies cho Backend
cd backend && npm install && cd ..

# Cài đặt dependencies cho Frontend
cd frontend && npm install && cd ..
```

---

### 3. Cấu Hình Biến Môi Trường (.env)

Tạo file `backend/.env` với nội dung mẫu sau:

```env
PORT=8080
JWT_SECRET=your_jwt_secret_key_here
GAME_SECRET_KEY=32_bytes_hex_string_here_for_aes_encryption
MONGO_URI=mongodb://localhost:27017/number-guessing-game
UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
MOVIE_API_URL=http://localhost:3001/api
```

---

### 4. Các Lệnh Thường Dùng (Chạy tại thư mục gốc)

Dự án đã được cấu hình quản lý tập trung ở file `package.json` gốc:

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Khởi động song song cả Backend (`:8080`) và Frontend (`:3002`) |
| `npm run build` | **Biên dịch một chạm**: Tự động kiểm tra cú pháp Backend và build tối ưu Frontend Next.js |
| `npm test` | Chạy bộ kiểm thử tự động **40 unit tests** của backend |
| `npm run build:frontend` | Chỉ build riêng phần Frontend Next.js |
| `npm run build:backend` | Chỉ kiểm tra cú pháp Backend |

---

### 5. Truy Cập Ứng Dụng

Sau khi chạy `npm run dev`:
* **Frontend Game**: Mở trình duyệt tại `http://localhost:3002`
* **Health Check Backend**: Truy cập `http://localhost:8080/health` để kiểm tra trạng thái hoạt động của server

---

## 🐳 Vận Hành Bằng Docker & Caddy (Production)

Trong môi trường máy chủ Production, hệ thống sử dụng **Docker** và reverse proxy **Caddy** làm cổng kết nối duy nhất:

```bash
# Build Docker image
docker build -t game-guessing-arena .

# Chạy container
docker run -p 8080:8080 --env-file backend/.env game-guessing-arena
```

Quy tắc định tuyến của Caddy (`Caddyfile`):
* `/socket.io/*` và `/api/*` được chuyển tiếp về server Node.js backend.
* Mọi route tĩnh và trang ứng dụng khác được chuyển tiếp về server Next.js.

---

Chúc bạn có những trận đấu trí số học thật kịch tính cùng **Bulls and Cows Game**! 🏆
