---
name: web-ui
description: Frontend web EduTalk trên Next.js 16 App Router — cổng thí sinh và dashboard admin. Kiến trúc ranh giới Server/Client Component, chuẩn thẩm mỹ chống giao diện AI nhạt, lớp gọi API qua axios kèm token Firebase, biểu đồ Recharts cho dashboard. Dùng khi sửa hoặc thêm trang, component, service, store trong web/, khi làm giao diện, hoạt ảnh, biểu đồ thống kê, hoặc trang predict/result/dashboard.
---

# Web — Next.js 16 App Router

```
web/src/
├── app/
│   ├── (main)/          cổng thí sinh: predict, result, chat, majors,
│   │                    news, community, history, profile, settings, auth
│   └── dashboard/       admin: analytics, model, users, posts, news,
│                        consultations, support
├── components/
│   ├── motion/          7 component chuyển động DỰNG SẴN — dùng lại, đừng viết lại
│   ├── features/        theo miền: chat, home, predict
│   ├── layout/          Navbar, BottomNav
│   └── ui/              Modal, OtpDialog
├── services/            một file cho mỗi miền API
├── store/               useAuthStore.ts (zustand)
└── lib/                 api.ts · firebase.ts · admission.ts · utils.ts
```

Stack thật: **Next 16.2 · React 19.2 · Tailwind v4 · framer-motion 12 · GSAP 3.15 ·
Recharts 3.10 · zustand 5 · axios · Firebase Web SDK 12 · lucide-react**.

```bash
cd web && npm run dev        # next dev --webpack → localhost:3000
```

**Lenis chưa được cài.** Tài liệu tham chiếu có nhắc tới nó — muốn dùng phải cài trước.

---

## Luật 1 — ranh giới Server / Client

Hoạt ảnh cần API trình duyệt (`window`, `requestAnimationFrame`, `IntersectionObserver`,
toạ độ chuột). Nhưng `page.tsx` và `layout.tsx` phải giữ là Server Component cho SEO và
streaming.

> **Giữ page/layout là Server Component. Bọc hoạt ảnh vào Client Component nguyên tử,
> nhận nội dung Server-rendered qua `children`.**

```tsx
// page.tsx — SERVER, không có 'use client'
import { SpotlightCard } from "@/components/motion/SpotlightCard";

export default function Page() {
  return (
    <SpotlightCard>       {/* client wrapper mỏng */}
      <h2>Nội dung render trên server</h2>
    </SpotlightCard>
  );
}
```

Dán `'use client'` lên cả trang để chạy được một hiệu ứng là **sai** — mất SEO và mất
streaming cho toàn bộ cây con.

---

## Luật 2 — chuẩn thẩm mỹ, chống giao diện AI nhạt

### Cấm

- Thẻ chết: `border border-gray-200 bg-white p-4` không phản hồi hover
- Nút Bootstrap mặc định: `bg-blue-500 hover:bg-blue-600`
- Trạng thái đổi tức thì — mở modal, chuyển tab, đổi layout đều phải có quán tính
- Nền phẳng trơ `#000000` hoặc `#ffffff` không có chiều sâu
- `transition: all 0.3s linear`

### Bắt buộc

- Hover nhấc nhẹ (`scale: 1.02`, `y: -2`), nhấn nén lại (`scale: 0.97`)
- Vật lý lò xo (`stiffness: 300`, `damping: 28`) hoặc `cubic-bezier(0.16, 1, 0.3, 1)`
- Chiều sâu: `backdrop-blur-xl`, viền hai lớp `ring-1 ring-white/10`, quầng sáng nhẹ
- **Luôn bọc `useReducedMotion`** — người dùng tắt hiệu ứng thì phải tôn trọng

Bảy component dựng sẵn ở `components/motion/`: `AnimatedBeam`, `BorderBeam`,
`KineticHeading`, `Marquee`, `ShimmerButton`, `SpotlightCard`, `TiltCard`. Dùng lại
trước. Cần dựng loại mới thì mở `references/motion-catalog.md`.

> **Đang làm việc nâng cấp giao diện?** Đọc `references/nang-cap-uiux.md` — đề bài đầy
> đủ: bảng màu khoá cứng, danh sách thư viện được phép cài, cách chia vùng, quy trình
> làm từng trang một. Cần tối ưu tỉ lệ hiển thị điện thoại thì xem
> `references/mobile-responsive.md`.

---

## Luật 3 — gọi API qua lớp `services/`, không `fetch` rải rác

`lib/api.ts` là instance axios duy nhất, đã cắm sẵn interceptor gắn token:

```
auth.currentUser.getIdToken()      ← ưu tiên, tự gia hạn được
localStorage "authToken"           ← chỉ có khi đăng nhập bằng email qua backend
```

Mỗi miền một file trong `services/`: `predict`, `auth`, `admin`, `analytics`, `history`,
`modelMetrics`, `news`, `posts`, `profile`. Component gọi service, **không gọi axios
trực tiếp** và không tự dựng header `Authorization`.

`baseURL` lấy từ `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8000`.

### Một chỗ dễ sai ở trang dự đoán

`RecommendInput` có cờ `save`:

| `save` | Endpoint | Hệ quả |
|---|---|---|
| `true` | `POST /api/v1/survey/submit` | ghi `prediction_history`, tăng `usageCount`, **cần token** |
| `false` | `POST /api/v1/predict/recommend` | chạy xong là quên, không cần đăng nhập |

Cùng mô hình, cùng kết quả. Nhưng luôn gọi `/recommend` thì trang `/history` sẽ **vĩnh
viễn rỗng**.

`subjectOrder` quyết định thứ tự điểm gửi đi — sai thứ tự thì mô hình vẫn trả kết quả
trông hợp lý nhưng sai. Web gửi `limit = 3`, nên **Top-3 là chỉ tiêu chính** của cả dự án.

---

## Luật 4 — dashboard admin dùng Recharts

Recharts 3.10 đã cài. Đừng thêm Chart.js hay thư viện biểu đồ thứ hai.

- Mỗi biểu đồ phải có **nhãn trục và đơn vị**; số liệu mô hình mà thiếu đơn vị là vô nghĩa
- Biểu đồ chỉ số dự đoán: kèm **mốc đoán bừa** nếu có — đây là luật xuyên suốt dự án, một
  con số 85% đứng trơ trọi có thể chỉ hơn đoán bừa 2 điểm
- Bọc trong `ResponsiveContainer`, đặt chiều cao cố định cho phần tử cha
- Trạng thái chờ: dùng **skeleton**, không dùng spinner giữa màn hình trống

---

## Trước khi coi là xong

- `npm run build` sạch — Next 16 bắt lỗi ranh giới Server/Client lúc build, không phải
  lúc dev
- Mở thật trang vừa sửa trong trình duyệt và nhìn nó, không chỉ đọc code
- Thử ở khổ hẹp — dự án có `BottomNav` riêng cho di động
- Kiểm tra trạng thái chờ và trạng thái rỗng, không chỉ trạng thái có dữ liệu
