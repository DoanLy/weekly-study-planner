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

### Thêm định dạng văn bản (in đậm, tô màu) cho khung "Câu trả lời" Speaking (mới nhất)
Người dùng muốn format câu trả lời cho đẹp (in đậm, tô màu) thay vì chỉ gõ text thường. Đã thêm:
- Cú pháp `==text==` → tô vàng (`<mark>`), bổ sung cạnh `**text**` (in đậm, đã có sẵn) trong `parseInlineMarkdown`/`formatNoteHtml`. CSS `mark` thêm trong `index.css`.
- 2 nút toolbar (icon `Bold`, `Highlighter` từ lucide-react) phía trên textarea: bấm khi đã bôi đen 1 đoạn text sẽ tự bọc `**...**` hoặc `==...==` quanh đoạn đó (không cần tự gõ cú pháp); nếu chưa chọn gì thì chèn placeholder "văn bản" để người dùng gõ đè.
- Thêm chế độ Xem/Sửa cho từng câu trả lời (giống pattern "Ghi chú bài học" ở Tasks): câu đã có nội dung mặc định hiện dạng đã định dạng đẹp (không editable, bấm "Sửa" để chỉnh); câu chưa có nội dung mặc định vào thẳng chế độ soạn (không mất công bấm mới gõ được).
- **Lưu ý code**: trạng thái Xem/Sửa mặc định ban đầu tính dựa theo `!q.userNote` nhưng phải "chốt" 1 lần qua `useEffect` khi chọn topic (seed vào state `editingAnswers`), KHÔNG được tính lại mỗi lần render — nếu tính lại trực tiếp theo nội dung hiện tại thì textarea sẽ tự đóng lại thành view-mode ngay khi người dùng gõ ký tự đầu tiên (đã gặp bug này khi test, đã sửa).

### Sửa mất dữ liệu khi đóng tab ngay sau khi sửa/xoá + xoá "chủ đề 1" hẳn
Người dùng xoá "chủ đề 1" (topic test cũ) nhiều lần nhưng nó "cứ hiện lại". Nguyên nhân thật: app chỉ lưu lên server sau debounce 700ms; nếu đóng/tải lại tab trong lúc đó, thay đổi (bao gồm xoá) không kịp lưu, mở lại app fetch lại data cũ trên server → trông như "xoá không được". **Đính chính lại phần "Sự cố" bên dưới**: 2 lần đầu "chủ đề 1" biến mất đúng là do process `vercel dev` mồ côi (đã xác minh qua `Get-Process`), nhưng rất có thể người dùng cũng đang tự xoá topic này qua UI thật song song lúc đó — nghĩa là ít nhất 1 trong 2 lần "khôi phục" của tôi thực ra là khôi phục lại thứ người dùng đã chủ động xoá. Lần này đã xoá hẳn "chủ đề 1" qua script trực tiếp theo đúng ý người dùng.

Đã sửa tận gốc race điều kiện đóng tab: thêm listener `visibilitychange` (khi ẩn tab) + `pagehide`, dùng `navigator.sendBeacon` để flush lưu ngay lập tức thay vì chờ debounce — hoạt động kể cả khi trang đang unload (fetch thường có thể bị huỷ giữa chừng lúc unload, sendBeacon thì không).

### Cải thiện UI khung "Câu trả lời" trong Speaking
Textarea giờ tự giãn chiều cao theo nội dung (không cần scroll để xem hết câu trả lời) — dùng `ref` + `onInput` set `style.height = scrollHeight`. Khung câu trả lời cũng được bọc riêng trong 1 khối có nền xám nhạt + border rõ ràng (`bg-slate-50/70 border border-slate-200 rounded-xl`) để tách biệt trực quan với câu hỏi và với câu hỏi/trả lời kế tiếp; thêm `shadow-sm` cho card câu hỏi để phân định rõ hơn giữa các câu hỏi.

### Dọn dữ liệu rác trong Calendar/dailyTasks (chỉ sửa data, không đổi code)
Người dùng báo vẫn thấy "dữ liệu rác" trong Lịch. Kiểm tra `dailyTasks` trong Postgres thấy 4 ngày (`2026-07-10`, `2026-09-02`, `2026-09-04`, `2026-09-07`) có task list bị "đóng băng" (baked) từ trước khi refactor sang dynamic rules: vẫn còn task của các rule đã bị xoá từ lâu ("Học clip thầy Tùng", "Dịch Anh-Việt & Việt-Anh"), và cả 1 task lạ tên "MÚA" với timestamp tạo giống hệt nhau trên cả 3 ngày (rõ ràng là data test/rác, không phải người dùng tự gõ). Cả 4 ngày này đều `completed:false`, `note:""` — không có customization thật nào bị mất. Đã xoá 4 override này khỏi `dailyTasks` (giữ nguyên `2026-07-08` vì có dữ liệu thật: task đã hoàn thành + note + task tự thêm). Sau khi xoá, các ngày này tự tính lại đúng theo `scheduleRules` hiện tại (đã verify qua preview: hiển thị khớp với các ngày Mon/Wed/Fri hoặc Tue/Thu/Sat lân cận, không còn task rác).

### Sửa tiếp bug search Speaking: chủ đề đang chọn không khớp query vẫn hiển thị
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
