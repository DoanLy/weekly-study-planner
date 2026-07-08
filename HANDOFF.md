# Handoff — Weekly Study Planner

Ghi lại bối cảnh phiên làm việc gần nhất để phiên sau (người hoặc AI) có đủ thông tin tiếp tục, không phải dò lại từ đầu.

## Thông tin project

- Local source: `C:\Users\lenovo\Documents\Codex\2026-06-02\b-n-c-n-nh-app\work\weekly-study-planner`
- GitHub: https://github.com/DoanLy/weekly-study-planner.git (branch `main`)
- Vercel project: `files-mentioned-by-the-user-weeklyplanner` (org `doanlys-projects`), production tại https://files-mentioned-by-the-user-weeklyp.vercel.app/
- Toàn bộ UI nằm trong 1 file: `src/App.jsx` (~2400 dòng, React + Vite + Tailwind + lucide-react)
- **Data lưu trong Postgres (Neon, qua Vercel Marketplace integration)**, không còn dùng Google Sheets. Local state vẫn cache trong `localStorage` (key `weekly-study-planner-data`) để mở app offline được, đồng bộ 2 chiều với API `/api/data` (`api/data.js`, serverless function dùng `@neondatabase/serverless`).
  - Bảng Postgres: `app_data(id text primary key, data jsonb, updated_at timestamptz)` — chỉ 1 row cố định `id = 'planner'` chứa toàn bộ state (giống hệt cách Google Sheets lưu trước đây, chỉ đổi backend).
  - Env var cần thiết: `DATABASE_URL` (đã được Vercel tự inject vào Production/Preview/Development khi cài integration Neon; local dev cần chạy `npx vercel env pull .env.local` để có file này).
  - Chạy dev đầy đủ (kèm API) bằng `npx vercel dev` chứ không phải `npm run dev` thuần (Vite thuần không chạy được `/api/*`). `.claude/launch.json` đã cấu hình sẵn preview tool dùng `vercel dev`.

## Trạng thái git tại thời điểm handoff

- Tất cả thay đổi trong phiên này (xem mục dưới) đã **commit + push** lên `main`.

## Các việc đã hoàn thành trong phiên này

### Chuyển từ Google Sheets sang Postgres (Neon) làm nguồn lưu trữ chính
- Cài Neon Postgres qua Vercel Marketplace (`npx vercel integration add neon`), tự động connect vào project và inject env vars.
- Thêm `api/data.js`: serverless function GET (đọc row `planner`) / POST (upsert row `planner`), tự tạo bảng `app_data` nếu chưa có (`CREATE TABLE IF NOT EXISTS`).
- `src/App.jsx`: thay `SHEETS_ENDPOINT` (Google Apps Script) bằng `DATA_API_ENDPOINT = '/api/data'`; cùng logic load-on-mount + debounce-save-700ms như cũ, chỉ đổi endpoint và bỏ `?action=load` (giờ phân biệt bằng HTTP method GET/POST).
- Viết script migration một lần `scripts/migrate-from-sheets.mjs`: fetch data thật từ Google Sheets endpoint cũ, insert vào Postgres. **Đã chạy và verify dữ liệu khớp** (documents, dailyTasks, scheduleRules, speakingTopics — bao gồm cả chủ đề Speaking người dùng đã tự tạo).
- Đã test round-trip (toggle 1 câu hỏi Speaking → xác nhận ghi vào DB → toggle lại như cũ) qua `vercel dev` local, không có lỗi console.
- Google Apps Script endpoint cũ **không bị xoá/động tới** — vẫn còn nguyên như một bản sao dữ liệu cũ, nhưng app không còn đọc/ghi vào đó nữa kể từ commit này.

**Lưu ý quan trọng cho phiên sau**: `DATABASE_URL` trong `.env.local` (khi chạy `vercel env pull`) trỏ **cùng một database** cho cả Production/Preview/Development — Neon integration này không tự tách branch riêng theo environment. Nghĩa là chạy `vercel dev` / test script ở local sẽ đọc/ghi thẳng vào dữ liệu thật của production (bảng chỉ có 1 row nên rủi ro thấp hơn so với append-log, nhưng vẫn cần cẩn thận khi test — ghi đè xong nhớ chạy lại `node --env-file=.env.local scripts/migrate-from-sheets.mjs` để khôi phục nếu lỡ ghi đè dữ liệu test).

## Việc cần làm tiếp (nếu người dùng đồng ý)

1. Cân nhắc xoá hẳn Google Apps Script project (hiện vẫn còn tồn tại như dữ liệu cũ, không ảnh hưởng gì nhưng cũng không còn dùng).
2. Cân nhắc cập nhật `README.md` (dòng 18-20 nhắc tới tính năng "pin tuần" cũ, có vẻ không còn khớp với UI "StudyFlow" hiện tại — chưa kiểm tra kỹ).
3. Nếu muốn tách biệt dữ liệu dev/production thật sự an toàn, có thể tạo riêng 1 Neon branch cho Development/Preview qua Neon dashboard rồi gán `DATABASE_URL` riêng cho từng environment trong Vercel.
