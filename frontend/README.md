# 🎮 Frontend — Bulls and Cows Game Arena (Next.js 16)

<div align="center">

<img src="https://img.shields.io/badge/Next.js-16.2.7-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
<img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
<img src="https://img.shields.io/badge/Socket.IO_Client-4.8.3-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
<img src="https://img.shields.io/badge/Web_Audio_API-Synthesizer-orange?style=for-the-badge" alt="Web Audio" />

</div>

Đây là mã nguồn Frontend của **Game Đoán Số Bí Mật (Bulls and Cows)**, được xây dựng với Next.js 16 (App Router), React 19, Tailwind CSS v4, và Web Audio API Synthesizer.

---

## 🌟 Tính Năng Frontend

- **Giao diện Cyber Gaming Esports**: Tối ưu hiển thị màn hình OLED, Dark mode hiện đại, gradient lung linh và hiệu ứng kính mờ (glassmorphism).
- **Bộ tổng hợp âm thanh Web Audio API (`sound.ts`)**:
  - Không tải file `.mp3` ngoài, không giật lag mạng.
  - Âm thanh gõ phím số theo thang âm C5-C6.
  - Chuông báo ngân 3 tầng ("Ting 🔔") nhắc nhở khi đối thủ khóa số hoặc ra chiêu Oẳn Tù Tì.
  - Fanfare hân hoan khi chiến thắng, thăng cấp, mở khóa thành tựu.
- **Pháo hoa giấy Canvas (`ConfettiCanvas.tsx`)**:
  - Tự động bung 120 mảnh kim tuyến đa sắc khi chiến thắng hoặc lên Rank.
  - Tự giải phóng 100% CPU/GPU sau 4.5 giây.
- **Biểu tượng cảm xúc trôi nổi (`FloatingEmoteOverlay.tsx`)**:
  - Thả cảm xúc hoạt họa trôi quanh avatar của chính người chơi theo hướng tự nhiên.
- **Bàn phím cơ số ảo (NumberPadModal)**:
  - Tối ưu cho màn hình cảm ứng di động, chống trùng lặp số, tự động hiển thị các lượt đoán đã thử trước đó.
- **Chế độ Nhúng Iframe (`embedded=1`)**:
  - Giao tiếp 2 chiều với website chính thông qua `postMessage`.
  - Khắc phục triệt để lỗi Hydration Mismatch giữa SSR và Client.
- **Đa ngôn ngữ (`i18n.ts`)**:
  - Hỗ trợ đầy đủ song ngữ Tiếng Việt (`vi`) và Tiếng Anh (`en`).

---

## 📁 Cấu Trúc Thư Mục Frontend

```text
frontend/src/
├── app/
│   ├── layout.tsx             # Root layout & Metadata
│   ├── page.tsx               # Trang sảnh & phòng đấu chính
│   ├── history/               # Trang lịch sử trận đấu cá nhân
│   ├── leaderboard/           # Bảng xếp hạng Elo toàn server
│   └── achievements/          # Danh sách huy hiệu & Danh hiệu trang bị
└── features/game/
    ├── components/
    │   ├── common/            # ConfettiCanvas, EquippedTitleBadge
    │   ├── lobby/             # Sảnh phòng, Quick Match, Danh sách phân trang
    │   ├── modals/            # NumberPad, GuessHistory, MatchSummary, Countdown
    │   ├── room/              # ActiveRoom, PlayingArena, SecretSetup, RpsDecision
    │   └── chat/              # Khung chat & Floating Emote Overlay
    ├── hooks/                 # useGameController, useGameProfile, useLocale
    ├── sound.ts               # Web Audio API Synthesizer
    ├── i18n.ts                # Từ điển song ngữ vi/en
    ├── utils.ts               # Tiện ích định dạng thời gian, tính toán giao diện
    └── types.ts               # Định nghĩa TypeScript toàn bộ luồng game
```

---

## 🚀 Khởi Chạy Frontend Độc Lập

### Cài đặt dependencies:
```bash
npm install
```

### Chạy môi trường phát triển:
```bash
npm run dev
```
Giao diện sẽ chạy tại: [http://localhost:3002](http://localhost:3002)

### Kiểm tra Build Production:
```bash
npm run build
```

---

## 🔗 Tích Hợp với Parent Website (client-en-website)

Khi chạy ở chế độ nhúng bên trong thẻ `<iframe>`:
* Truyền query parameter: `?embedded=1`.
* Khi đăng nhập trên website chính, token người dùng được truyền qua sự kiện:
  ```javascript
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'AUTH_TOKEN') {
      // Nhận JWT token và tự động đăng nhập vào phòng đấu
    }
  });
  ```
