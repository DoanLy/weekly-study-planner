# Handoff — Weekly Study Planner

Ghi lại bối cảnh phiên làm việc gần nhất để phiên sau (người hoặc AI) có đủ thông tin tiếp tục, không phải dò lại từ đầu.

**Quy tắc chuẩn cho project này: luôn cập nhật file này TRƯỚC MỖI LẦN `git push`.**

## Thông tin project

- Local source: `C:\Users\lenovo\Documents\Codex\2026-06-02\b-n-c-n-nh-app\work\weekly-study-planner`
- GitHub: https://github.com/DoanLy/weekly-study-planner.git (branch `main`)
- Vercel project: `files-mentioned-by-the-user-weeklyplanner` (org `doanlys-projects`), production tại https://files-mentioned-by-the-user-weeklyp.vercel.app/
- Toàn bộ UI nằm trong 1 file: `src/App.jsx` (~2400 dòng, React + Vite + Tailwind + lucide-react)
- **Data lưu trong Postgres (Neon, qua Vercel Marketplace integration)**, không còn dùng Google Sheets. Local state vẫn cache trong `localStorage` (key `weekly-study-planner-data`) để mở app offline được, đồng bộ 2 chiều với API `/api/data` (`api/data.js`, serverless function dùng `@neondatabase/serverless`).
  - Bảng Postgres: `app_data(id text primary key, data jsonb, updated_at timestamptz)` — chỉ 1 row cố định `id = 'planner'` chứa toàn bộ state.
  - Env var cần thiết: `DATABASE_URL` (Vercel tự inject vào Production/Preview/Development; local dev cần chạy `npx vercel env pull .env.local` để có file này — đã có sẵn, không cần chạy lại trừ khi bị mất).
  - Chạy dev đầy đủ (kèm API) bằng `npx vercel dev` chứ không phải `npm run dev` thuần (Vite thuần không chạy được `/api/*`). `.claude/launch.json` đã cấu hình sẵn preview tool dùng `vercel dev`.

## ⚠️ Lưu ý vận hành quan trọng (đọc trước khi test local)

1. **`DATABASE_URL` local trỏ THẲNG vào DB thật của production** — không có DB riêng cho dev/preview. Mọi thao tác test qua `vercel dev` đều đọc/ghi dữ liệu thật.
2. **Sự cố đã xảy ra (2026-07-08)**: một tiến trình `vercel dev` không chết hẳn dù đã gọi lệnh dừng (Windows không kill sạch process con), để lại state cũ trong bộ nhớ và tự động ghi đè dữ liệu thật vài phút sau đó (mất 1 topic Speaking của người dùng — đã khôi phục lại đúng nguyên bản 2 lần). Đã sửa code (`hasLoadedRemote` giờ chỉ set ở nhánh success/failure riêng của từng request, không dùng `.finally()` chung; thêm `Cache-Control: no-store`), nhưng nguyên nhân gốc là **process con bị mồ côi**, không chỉ do code.
3. **Quy trình test local an toàn**: trước khi `preview_start`, kiểm tra không còn process node nào đang chạy (`Get-Process node`). Sau khi `preview_stop`, PHẢI xác nhận lại bằng `Get-Process node` / `Get-NetTCPConnection -LocalPort 5173` rằng nó thực sự đã chết — đừng tin thông báo "stopped" của tool. Nếu nghi ngờ dữ liệu bị ảnh hưởng, so sánh ngay với snapshot đã biết là đúng và khôi phục lập tức.

## Các việc đã hoàn thành (các phiên gần đây, mới nhất ở trên)

### Sửa tiếp bug search Speaking: chủ đề đang chọn không khớp query vẫn hiển thị (mới nhất)
Sau khi sửa `filterSpeakingTopicByQuery` (session trước), vẫn còn 1 kẽ hở: nếu chủ đề ĐANG ĐƯỢC CHỌN (selectedTopicId) không khớp cả tên lẫn câu hỏi với search query mới, `selectedTopic` vẫn tra theo ID cũ và hiển thị chủ đề đó với "Chưa có câu hỏi nào" (gây hiểu lầm là lỗi). Đã thêm `useEffect` trong `SpeakingView`: khi query thay đổi và chủ đề đang chọn không còn nằm trong `activeTopicsList` (danh sách đã lọc), tự động chuyển sang chủ đề đầu tiên khớp kết quả.

### Cải thiện UI ô "Câu trả lời" trong Speaking
Layout câu hỏi/câu trả lời cũ dùng grid 12 cột (câu hỏi 7 cột, câu trả lời 5 cột) với textarea chỉ 2 dòng, chữ `text-xs` — khó đọc lại câu trả lời khi ôn tập. Đã đổi sang layout xếp dọc: câu hỏi trên cùng, câu trả lời full-width bên dưới, textarea 4 dòng (`min-h-[7rem]`, `resize-y`, `text-sm leading-relaxed`) để dễ đọc và có thể kéo giãn thêm nếu cần.

### Seed nội dung Speaking Part 1/2/3
Đã nạp 41 chủ đề Part 1 (mỗi câu hỏi riêng), 62 thẻ cue-card Part 2 (4-5 gạch đầu dòng gộp thành 1 câu hỏi, nối bằng " • "), 62 "Topic N" Part 3 (mỗi câu hỏi riêng) — tổng 596 câu hỏi — qua script `scripts/seed-speaking-content.mjs`, giữ nguyên topic "chủ đề 1" người dùng đã tự tạo trước đó.

### Sidebar thu gọn/mở rộng + sửa bug search Speaking
Sidebar trái giờ có nút thu gọn còn icon-only (desktop only, nút chevron cạnh logo). Sửa bug: tìm kiếm theo tên chủ đề (vd "chủ đề") trước đó lọc luôn cả câu hỏi bên trong theo text câu hỏi, làm mất câu hỏi thật sự thuộc chủ đề khớp tên — giờ nếu query khớp tên chủ đề thì hiện toàn bộ câu hỏi, chỉ lọc câu hỏi khi query không khớp tên chủ đề (hàm `filterSpeakingTopicByQuery`).

### Menu Speaking (Part 1/2/3, chủ đề/câu hỏi, tick hoàn thành, tự lưu câu trả lời)
Thêm hẳn view "Speaking" mới trong `src/App.jsx` (component `SpeakingView`), lưu trong `data.speakingTopics.{part1,part2,part3}`.

### Chuyển từ Google Sheets sang Postgres (Neon)
- `api/data.js`: serverless function GET/POST cho bảng `app_data`.
- Migration một lần từ Google Sheets cũ: `scripts/migrate-from-sheets.mjs` (đã chạy, đã verify khớp dữ liệu).
- Google Apps Script endpoint cũ vẫn còn tồn tại nhưng app không còn đọc/ghi vào đó nữa.

## Việc cần làm tiếp (nếu người dùng đồng ý)

1. Cân nhắc xoá hẳn Google Apps Script project cũ (không còn dùng).
2. Cân nhắc cập nhật `README.md` (dòng 18-20 nhắc tính năng "pin tuần" cũ, không còn khớp UI "StudyFlow" hiện tại).
3. Nếu muốn tách biệt dữ liệu dev/production an toàn hơn, tạo riêng 1 Neon branch cho Development/Preview qua Neon dashboard rồi gán `DATABASE_URL` riêng cho từng environment trong Vercel.
