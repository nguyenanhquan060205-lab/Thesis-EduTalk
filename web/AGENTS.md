<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Luật cho `web/`

**Đọc trước khi sửa:** `../.claude/skills/web-ui/SKILL.md`
**Đang nâng cấp giao diện:** `../.claude/skills/web-ui/references/nang-cap-uiux.md`
**Cần dựng component chuyển động mới:** `../.claude/skills/web-ui/references/motion-catalog.md`

Chú thích code viết **tiếng Việt**.

## Năm điều không được vi phạm

1. **Ranh giới Server/Client.** `page.tsx` và `layout.tsx` giữ là Server Component. Muốn
   hoạt ảnh thì bọc vào Client Component mỏng nhận `children`. Dán `'use client'` lên cả
   trang là mất SEO và mất streaming cho toàn bộ cây con.

2. **Bảng màu khoá cứng.** Nền `slate`, nhấn `blue-600`, ngữ nghĩa `emerald`/`amber`/`rose`.
   Ba màu ngữ nghĩa đó gắn với `an_toan`/`co_kha_nang`/`rui_ro_cao` — **cấm dùng để trang
   trí**, thí sinh sẽ tưởng mình bị cảnh báo rủi ro.

3. **Gọi API qua `src/services/`.** Không gọi axios trực tiếp trong component, không tự
   dựng header `Authorization` — `src/lib/api.ts` đã có interceptor gắn token Firebase.

4. **Dùng lại 7 component ở `src/components/motion/`** trước khi viết mới.

5. **Không thêm thư viện biểu đồ hay hoạt ảnh mới.** Recharts + framer-motion + GSAP đã
   có. Thư viện khác xem danh sách được duyệt trong `nang-cap-uiux.md`.

## Bẫy hay dính

Cờ `save` trong `RecommendInput`: `true` → `/api/v1/survey/submit` (ghi lịch sử, cần
token); `false` → `/api/v1/predict/recommend` (chạy xong quên). Luôn gọi `/recommend` thì
trang `/history` **vĩnh viễn rỗng**.

## Xong nghĩa là

`npm run build` sạch — Next 16 chỉ bắt lỗi ranh giới Server/Client lúc build, không phải
lúc dev. Và đã mở trang trong trình duyệt nhìn thật, không chỉ đọc code.
