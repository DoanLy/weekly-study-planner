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

### Notes: xem/sửa ghi chú trực tiếp từ Master Notes + đổi editor ghi chú task sang WYSIWYG (mới nhất)
Người dùng yêu cầu 2 việc:
1. Ở trang Master Notes (`NotesView`), bấm vào note phải xem được chi tiết + sửa được ngay, không cần bấm "Xem chi tiết ngày này" để nhảy sang trang Tasks của ngày đó.
2. Modal "Soạn ghi chú" (`FullNoteModal`, mở qua nút "Mở rộng" ở Tasks) nên dùng editor giống bên Speaking (bôi đen để format ngay, không phải gõ markdown rồi xem preview).

**Thay đổi:**
- Thêm 2 nút "Xem" / "Sửa" trực tiếp trên mỗi card ở `NotesView` (giữ lại link nhỏ "Đi tới ngày này" để vẫn nhảy sang Tasks nếu cần). "Xem" mở modal mới `NoteViewModal` (đọc-only, cùng pattern với `DocumentViewModal`), có nút "Sửa" ở footer để chuyển thẳng sang edit.
- `FullNoteModal` đổi từ `<textarea>` + panel Preview markdown sang `<div contentEditable>` + 2 nút toolbar (Bold, Highlighter) dùng `execCommand`, giống hệt pattern đã làm cho Speaking — bỏ hẳn panel Preview chia đôi, seed nội dung 1 lần qua `dataset.seeded` để không mất con trỏ khi gõ.
- **Lưu ý quan trọng đã sửa 1 bug tiềm ẩn**: `updateTask()` (dùng bởi hầu hết nơi khác) chỉ thao tác trên `getTasksForDate(data, selectedDate)` — tức là ngầm định note đang sửa thuộc `selectedDate` hiện tại. Điều này đúng ở Tasks (task luôn thuộc ngày đang chọn) nhưng SAI khi mở sửa note từ Master Notes (note có thể thuộc ngày bất kỳ, khác `selectedDate`). Đã thêm state `fullNoteTaskDate` (chốt ngày của note lúc `openFullNote(task, dateKey)` được gọi) và `saveFullNote()` giờ tự lấy đúng `dailyTasks[fullNoteTaskDate]` để lưu, không phụ thuộc `selectedDate` nữa. Đã verify qua `vercel dev` + đọc thẳng DB: sửa note ngày 2026-07-16 trong khi `selectedDate` đang là hôm nay (2026-07-21) lưu đúng vào đúng ngày 07-16, không đụng tới dữ liệu ngày 07-21.
- **Tương thích ngược dữ liệu cũ**: `task.note` trước đây lưu dạng markdown thô (`**bold**`, `==mark==`, `` `code` ``, `- list`) hiển thị qua `formatNoteHtml()`; giờ editor mới lưu thẳng HTML thật (giống Speaking). Thêm helper `renderNoteHtml(text)`: nếu nội dung đã chứa thẻ HTML thật thì render thẳng, nếu không (note cũ dạng markdown/plain text) thì vẫn chạy qua `formatNoteHtml()` như cũ — không có note cũ nào bị vỡ định dạng. Đã kiểm tra trực tiếp DB thật: chỉ có 3 task có note, 1 cái dùng markdown (`**Listen**`) — đã verify vẫn hiển thị đậm đúng sau khi đổi code.
- Thêm CSS `white-space: pre-wrap` cho `.rich-note-cell` và `.study-note-preview` để giữ đúng xuống dòng (`\n`) của note cũ khi hiển thị dạng raw HTML.
- **Lưu ý**: chỉ đổi modal "Soạn ghi chú" (mở rộng) sang editor mới; ô textarea sửa nhanh ngay trong `TaskCard` (nút "Sửa" inline, không phải "Mở rộng") VẪN giữ nguyên dạng markdown thô — người dùng chỉ yêu cầu đổi modal, chưa đổi ô inline này.

### Cải thiện câu trả lời Testing Q&A — Section 9 Q1
Viết lại câu trả lời cho câu hỏi "Deadline is urgent, only 50% tested" (id: s10q2) trong `src/testing-data.json`.
Câu trả lời mới có cấu trúc rõ hơn: opening ngắn gọn, 4 bước hành động, go/no-go condition, communication script, post-release note.
Từ vựng dùng IT quen thuộc (backlog, smoke test, hotfix, sign-off, go/no-go, defect tracker, regression) thay vì jargon phức tạp.

### Thêm menu Testing Q&A
Thêm section Testing vào sidebar nav với 268 câu hỏi phỏng vấn Senior Tester từ file `D:\ENGLISH\VOCAB TESTING\Senior_Tester_Interview_QA.docx`.

**Files mới/thay đổi:**
- `src/testing-data.json` — toàn bộ 268 Q&A (20 sections) được parse từ docx, lưu dạng JSON tĩnh (không cần DB)
- `src/testing-glossary.js` — từ điển ~130 thuật ngữ testing/software với giải thích tiếng Việt theo ngữ cảnh
- `src/App.jsx` — thêm import, navItem `testing` (icon `FlaskConical`), component `TestingView` + `TestingAnswerRenderer`

**UI (view-only, không edit):**
- Panel trái: accordion 20 sections; bấm section để mở/đóng danh sách câu hỏi; có badge đếm số câu mỗi section
- Panel phải: hiển thị Q&A đầy đủ khi chọn câu hỏi; breadcrumb section ở trên cùng
- Search: filter real-time theo nội dung câu hỏi + câu trả lời, tự expand các section có kết quả
- Tooltip: các từ kỹ thuật trong phần trả lời được gạch chân (màu xanh); bấm vào → popup nổi hiện nghĩa tiếng Việt trong ngữ cảnh phần mềm/testing; bấm ra ngoài để đóng

**Module-level constant `GLOSSARY_REGEX`**: dùng `\b(term1|term2|...)\b` (case-insensitive), các terms sort theo độ dài giảm dần để ưu tiên match dài nhất trước (vd: "Boundary Value Analysis" trước "BVA").

### Tách "Xem" và "Sửa" tài liệu thành 2 luồng riêng
Người dùng không muốn UI chung kiểu chia đôi màn hình (bên trái nhập raw, bên phải Preview) cho tài liệu trong mục Documents. Đã tách:
- Card tài liệu giờ có 3 nút riêng: **Xóa** / **Xem** / **Sửa** (trước là 1 nút "Xem / Sửa" gộp).
- **Xem** mở `DocumentViewModal` (component mới) — chỉ hiển thị nội dung đã format đẹp (read-only), không có ô nhập; có nút "Sửa" ở footer để chuyển thẳng sang chế độ chỉnh sửa.
- **Sửa** mở `DocumentModal` đã đơn giản hóa — bỏ hẳn panel Preview `md:grid-cols-2`, giờ chỉ còn 1 cột: form nhập tiêu đề + textarea nội dung raw. Đổi width `max-w-5xl` → `max-w-2xl`.
- State mới `viewingDocumentId` + `openViewDocument`/`closeViewDocument`; `deleteDocument` cũng đóng view modal nếu tài liệu đang xem bị xóa; `openEditDocument` reset `viewingDocumentId` để không mở chồng 2 modal.
- **Lưu ý**: `FullNoteModal` (Soạn ghi chú của Tasks) VẪN giữ layout chia đôi Preview — chỉ đổi riêng phần Documents theo yêu cầu.

### Sửa lỗi Dashboard tự động focus sai ngày
Người dùng báo hôm nay là 13/7 nhưng lịch trên Dashboard lại bôi xanh (focus) ngày 8. Nguyên nhân: hằng số `INITIAL_DATE` (dùng làm `currentDate`/`selectedDate` mặc định khi mở app) bị hardcode cứng `new Date(2026, 6, 8)` — chắc là sót lại từ lúc test tính năng trước đó — thay vì lấy ngày thực tế. Đã sửa thành `new Date()` ở [src/App.jsx:42](src/App.jsx:42). Đã verify qua preview (`vercel dev`): reload lại thấy ngày 13 được bôi xanh đúng, và xác nhận process `vercel dev` chết hẳn sau `preview_stop` (`Get-NetTCPConnection -LocalPort 5173` không còn ai ở trạng thái Listen).

### Đổi khung "Câu trả lời" Speaking thành editor bôi-đen-để-format trực tiếp
Người dùng không muốn kiểu "gõ markdown rồi bấm Xem để thấy định dạng" — muốn kiểu bôi đen chữ là format ngay lập tức (giống Google Docs/Notion), bỏ hẳn nút Xem/Sửa vừa thêm trước đó.

Đã đổi từ `<textarea>` (lưu markdown text) sang `<div contentEditable>` (lưu HTML trực tiếp trong `userNote`):
- 2 nút toolbar (Bold, Highlighter) gọi `document.execCommand('bold')` / `document.execCommand('hiliteColor', false, '#fef08a')` trên phần đang bôi đen — thao tác tức thời, thấy kết quả ngay, không cần chế độ xem riêng.
- Nút toolbar dùng `onMouseDown={(e) => e.preventDefault()}` để không bị mất vùng bôi đen (selection) khi click chuyển focus ra khỏi ô đang soạn — nếu thiếu dòng này thì bấm nút sẽ không có tác dụng.
- Paste vào ô luôn ép thành plain text (`handleAnswerPaste`, chặn định dạng lạ từ nguồn dán vào).
- Ref callback set `innerHTML` đúng 1 lần khi phần tử DOM mới mount (đánh dấu qua `el.dataset.seeded`), không set lại mỗi lần render — nếu thiếu bước này sẽ bị mất vị trí con trỏ / nội dung gõ dở mỗi lần gõ phím.
- Đã kiểm tra dữ liệu `userNote` hiện có không chứa ký tự `<`, `>`, `&` nên chuyển sang lưu HTML an toàn, không cần escape thêm.
- Bỏ hẳn state `editingAnswers` và effect seed mặc định Xem/Sửa (không cần nữa).

### Sự cố khi verify + khôi phục dữ liệu thật bị hỏng do test (chỉ sửa data, không đổi code)
Sau khi deploy tính năng in đậm/tô màu, lúc verify production đã phát hiện câu trả lời thật của người dùng cho "Do you wear a watch?" (topic Watch, Part 1) bị hỏng dòng đầu tiên: `"1. ==Do ==you **wear **a ==watch==?"` thay vì `"1. Do you wear a watch?"`. Nguyên nhân: lúc test tính năng format trước khi push, đã dùng `document.querySelector('button[title="In đậm"]')` KHÔNG giới hạn phạm vi (scope) đúng textarea/question đang test, nên có lúc bấm nhầm vào nút của câu hỏi khác (kể cả câu hỏi thật chứa data người dùng) — chèn `**`/`==` sai vị trí. Đã phát hiện qua kiểm tra production sau deploy và khôi phục lại đúng nguyên văn dòng đầu (phần còn lại của câu trả lời không bị ảnh hưởng). **Bài học**: khi test bằng script trên nhiều câu hỏi giống nhau (nhiều nút cùng title), LUÔN giới hạn `querySelector` trong đúng card/phần tử cha của câu hỏi đang test (`.closest(...)` rồi mới `querySelector` bên trong), không dùng query toàn trang.

### Thêm định dạng văn bản (in đậm, tô màu) cho khung "Câu trả lời" Speaking
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
