# Handoff — Weekly Study Planner

Ghi lại bối cảnh phiên làm việc gần nhất để phiên sau (người hoặc AI) có đủ thông tin tiếp tục, không phải dò lại từ đầu.

**Quy tắc chuẩn cho project này: luôn cập nhật file này TRƯỚC MỖI LẦN `git push`.**

**Quy tắc thứ hai: mỗi khi đã làm xong TẤT CẢ yêu cầu của người dùng trong phiên (không còn việc gì dở dang), phải tự động `git push` code lên GitHub — không cần người dùng nhắc lại.**

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

### Documents: bổ sung toolbar soạn thảo đầy đủ (mới nhất)
Người dùng gửi ảnh mô tả 1 toolbar rich-text đầy đủ (dropdown cỡ chữ/tiêu đề, in đậm/nghiêng/gạch chân, tô màu nền/chữ, căn lề, danh sách, chèn bảng, xóa định dạng) và yêu cầu bổ sung vào editor "Tạo tài liệu mới" — trước đó `DocumentModal` chỉ có 2 nút (Bold + Highlighter).

- `DocumentModal` ([src/App.jsx:3346](src/App.jsx:3346)): toolbar giờ có 13 nút, tất cả vẫn dùng `document.execCommand` (đúng pattern cũ), cách nhau bằng divider dọc:
  1. Dropdown "Cỡ chữ" (2 chữ "A" + `ChevronDown`, state `sizeMenuOpen` + `sizeMenuRef`, đóng khi click ra ngoài qua `useEffect`/`mousedown` listener) → `applyBlock('H1'|'H2'|'H3'|'P')` dùng `execCommand('formatBlock', ...)`.
  2. Bold/Italic/Underline (`execCommand('bold'|'italic'|'underline')`).
  3. Highlight nền (giữ nguyên, `#fbd95f`) + tô màu chữ mới (`Baseline` icon, `execCommand('foreColor', '#CE4F46')` — 1 màu cố định, không có color picker, theo đúng pattern đơn giản có sẵn của nút highlight).
  4. Căn trái/giữa/phải (`justifyLeft/Center/Right`).
  5. Danh sách dấu đầu dòng/đánh số (`insertUnorderedList`/`insertOrderedList`).
  6. Chèn bảng (`insertTable()`, hàm mới) + Xóa định dạng (`clearFormatting()`, hàm mới, đẩy `ml-auto` sang phải cuối thanh).
- **Bug đã sửa lúc verify**: `insertTable()` ban đầu dùng `execCommand('insertHTML', ...)` — nếu con trỏ đang ở trong `<h1>`/list, bảng bị chèn **lồng bên trong** thẻ đó (HTML invalid, vd `<h1><table>...</table></h1>`). Sửa bằng cách tự thao tác DOM (`Range`/`Selection`) để tìm block-level con trực tiếp của editor chứa con trỏ, rồi chèn `<table>` + `<div><br></div>` (placeholder để gõ tiếp) làm **sibling** ngay sau block đó — không bao giờ lồng vào heading/list nữa. Chọn `<div>` thay vì `<p>` cho placeholder vì đã phát hiện thêm 1 quirk khác của Chrome: `execCommand('insertUnorderedList')` áp lên nội dung trong `<p>` đôi khi lồng `<ul>` **bên trong** `<p>` (HTML invalid, tự "sửa" thành 2 `<p>` rỗng khi parse lại) — dùng `<div>` thì Chrome thay thế sạch thành `<ul>`, không lồng.
- CSS mới trong [src/index.css](src/index.css): style viền/padding cho `table/td/th` trong cả `.rich-note-cell` (đang soạn) và `.study-note-preview` (xem/preview), header row có nền teal nhạt.
- Thêm import icon mới từ `lucide-react`: `AlignCenter, AlignLeft, AlignRight, Baseline, Eraser, Italic, List, ListOrdered, Table, Underline` (giữ alphabet như các import cũ).
- Đã verify qua `weekly-study-planner-ui-only` (cổng 5174, Vite thuần, KHÔNG chạm DB thật — trang hiện rõ "Mất kết nối, đang dùng dữ liệu trên máy"): test từng nút qua click thật + đọc `innerHTML` sau mỗi thao tác — Bold/Italic/Underline/Align/Highlight/Text color/Clear formatting đều ra đúng HTML mong đợi; dropdown H1/H2/H3/Văn bản thường áp đúng thẻ và tự đóng; chèn bảng khi con trỏ trong H1 giờ ra đúng `<h1>text</h1><table>...</table><div><br></div>` (không còn lồng); lưu tài liệu + mở lại "Sửa" load đúng lại nội dung đã lưu; không có lỗi console. Đã dừng server + xác nhận (không xóa được tài liệu test do `window.confirm` bị chặn trong môi trường headless — vô hại vì đây là localStorage riêng của server ui-only, tách biệt hoàn toàn khỏi DB thật).
- **Lưu ý cho lần sau**: nếu thêm nút toolbar mới dùng `execCommand`, cẩn thận với quirk lồng thẻ khi cursor đang trong 1 block "đặc biệt" (heading/list/table) — nên test cụ thể case này thay vì chỉ test trên văn bản thường.

### Tasks: thiết kế lại UI cho gọn
Người dùng gửi ảnh trang Tasks và nói UI "nhìn rối và chiếm diện tích", yêu cầu làm lại UI nhưng **giữ nguyên toàn bộ tính năng**.

- **Header gộp 3 thẻ thành 1** ([src/App.jsx:1517](src/App.jsx:1517), `TasksView`): trước đó là 3 card riêng (thanh "Quay lại Dashboard" + dòng ngày; hero tên thứ + số ngày watermark + "3 mục" + nút thêm; card tiến độ). Giờ chỉ còn 1 card: nút back thu về `icon-btn` tròn 36px, tiêu đề `Thứ Năm 30/07/2026` (`text-2xl`), dòng phụ gộp `THURSDAY · N mục · đã xong X/Y`, nút "Thêm mục mới" (`btn-sm`), và thanh tiến độ mảnh (`h-2`) + `%` ở hàng dưới. Gap section `6` → `3`, gap list card `4` → `2.5`. Empty-state cũng nén lại (`p-12` → `p-8`, icon 64 → 48px).
- **TaskCard 1 hàng + ghi chú thu gọn** ([src/App.jsx:1610](src/App.jsx:1610)): checkbox hoàn thành (28px) chuyển sang **bên trái**, kế đó là icon môn + tiêu đề (`text-base`, `truncate`) và dòng meta nhỏ `giờ · lĩnh vực`; bên phải là 3 nút: pill "Ghi chú" (có chevron + chấm teal nếu đã có nội dung), `Mở rộng` (icon `Expand`), `Xóa`.
- Vùng ghi chú **mặc định đóng** — đây là chỗ tiết kiệm diện tích nhiều nhất. State cục bộ `expanded` trong `TaskCard`; `noteOpen = expanded || editing` nên khi parent bật `editingNotes[task.id]` thì vùng note vẫn tự mở. Khi đóng mà task có note thì hiện **1 dòng preview text thuần** (`truncate`), click vào là mở.
- Thêm helper `noteToPlainText()` ([src/App.jsx:524](src/App.jsx:524)) để rút note (cả dạng HTML lẫn markdown) về 1 dòng cho preview. Thêm import `ChevronDown`.
- **Tính năng giữ nguyên đủ**: tick hoàn thành, xóa, `Sửa`/`Xem` (toggle textarea inline), `Mở rộng` (modal soạn ghi chú), click ô trống để bắt đầu soạn, tiến độ ngày, thêm mục, quay lại Dashboard. **Chỉ bỏ 1 thứ hiển thị dư**: badge "Chờ hoàn tất / Đã hoàn tất" ở footer card — trạng thái này đã thể hiện bằng checkbox (teal + dấu check) và tiêu đề mờ đi.
- Số đo thực tế (desktop 1280×720, `weekly-study-planner-ui-only-c` cổng 5177, Vite thuần nên KHÔNG chạm DB thật): header 98px (trước là 3 card ~330px), mỗi card 64px khi đóng note / 88px khi có preview 1 dòng / 176px khi mở note / 230px khi đang sửa. Cả ngày 3 mục cao 321px, không phải scroll (trước đó 1 card đã cao hơn 300px).
- Đã verify từng tính năng bằng JS click + đọc DOM: mở/đóng note, click ô trống → textarea, gõ note → collapse thấy đúng 1 dòng preview + chấm teal, `Mở rộng` mở modal "Soạn ghi chú" đúng nội dung rồi đóng, tick hoàn thành → checkbox `rgb(69,175,166)` + tiêu đề `rgb(114,137,140)` + header đổi thành "đã xong 1/3 · 33%", modal "Thêm nhiệm vụ" mở/đóng OK, nút back về Dashboard OK, mobile 375px không tràn ngang. Không lỗi console; `npm run build` pass. Đã hoàn tác dữ liệu test trong localStorage về nguyên trạng (3 task `completed:false`, `note:""`).
- **Lưu ý môi trường (gặp lại)**: (1) Không chụp được screenshot — Browser pane không hiển thị. (2) Sau khi HMR, CSS Tailwind có thể **thiếu utility mới** (lúc đầu `md:w-64` không có → sidebar chiếm hết chiều rộng, mọi số đo layout sai bét); phải `navigate` reload full trang trước khi tin số đo. (3) `getComputedStyle` đọc ngay sau click cho ra **màu giữa transition** (checkbox teal đọc ra trắng) vì tab hidden nên transition không chạy tiếp — verify màu bằng cách reload rồi đo trên render đầu. (4) Đọc DOM phải ở lần gọi `javascript_tool` **sau** cú click, không cùng lần (React chưa re-render).
- [.claude/launch.json](.claude/launch.json): thêm cấu hình thứ 4 `weekly-study-planner-ui-only-c` (cổng 5177) vì các cổng cũ có thể bị phiên chat khác chiếm.

### Documents: thêm ô tìm kiếm theo tiêu đề
Người dùng muốn ở menu Documents có thể search tài liệu theo tiêu đề (trước đó chỉ có danh sách card, không lọc được).

- `DocumentsView` ([src/App.jsx:1886](src/App.jsx:1886)): thêm state `searchQuery` + `filteredDocuments` (`useMemo`, lọc `doc.title` theo `includes()` không phân biệt hoa/thường). Ô input đặt cạnh nút "Tạo tài liệu mới", cùng pattern UI với ô search ở Testing/Speaking (`field-input rounded-full`, icon `Search` lucide).
- Thêm empty-state riêng khi search không ra kết quả ("Không tìm thấy tài liệu nào") — khác với empty-state gốc khi chưa có tài liệu nào.
- Đã verify qua `weekly-study-planner-ui-only-b` (cổng 5176, Vite thuần, không chạm DB thật): tạo 2 tài liệu test ("Speaking Part 1 Questions", "Vocabulary List Unit 5"), gõ "vocab" chỉ lọc đúng 1 kết quả, gõ từ khoá không khớp ra đúng empty-state "Không tìm thấy tài liệu nào". Không lỗi console.
- **Lưu ý gặp lại**: gõ phím `Delete`/`ctrl+a` qua Browser pane vào input React-controlled không đáng tin (giống bug đã ghi nhận trước đây) — phải dùng `form_input` để set giá trị trực tiếp mới verify được logic chính xác.

### Tasks: task hoàn thành chỉ làm mờ tiêu đề, bỏ gạch ngang
Người dùng không thích tiêu đề bị gạch ngang (`line-through`) khi tick hoàn thành — chỉ cần làm mờ chữ.

- [src/App.jsx:1644](src/App.jsx:1644) (`TaskCard`): class khi `task.completed` đổi từ `'text-ink-400 line-through'` → `'text-ink-400'`. Đây là chỗ duy nhất trong `src/App.jsx` dùng `line-through`.
- Đã verify qua `weekly-study-planner-ui-only-b` (cổng 5176, không chạm DB thật): tick hoàn thành → `textDecorationLine: "none"`, màu chữ chuyển sang xám mờ `rgb(114, 137, 140)`, badge footer đổi thành "Đã hoàn tất"; bỏ tick thì trở lại "Chờ hoàn tất". Không lỗi console, `npm run build` pass.

### Tasks: gộp icon + tiêu đề thành 1 hàng, dời giờ học xuống footer card
Tiếp theo thay đổi bên dưới, người dùng gửi thêm 1 ảnh mockup: icon tròn nằm bên trái, tiêu đề nằm ngay cạnh trên cùng 1 hàng, không còn pill giờ ở đầu card. Hỏi lại thì người dùng chọn phương án **đưa giờ học xuống dòng "Lĩnh vực" ở cuối card**.

- [src/App.jsx:1637](src/App.jsx:1637) (`TaskCard`): khối header giờ là 1 `div` flex chứa icon tròn (`h-9 w-9`, icon `size={16}`, có `shrink-0`) + `<h3>` tiêu đề. Bỏ hẳn hàng badge giờ ở đầu card.
- Footer card: `Lĩnh vực: ...` và giờ học (icon `Clock` + `task.time`) nằm cùng 1 span flex-wrap (`gap-x-2.5 gap-y-1`); giờ chỉ render khi `task.time` có giá trị.
- Thêm import `Clock` từ `lucide-react`. `THEME_STYLES[...].badge` **vẫn còn dùng** ở chỗ khác ([src/App.jsx:3013](src/App.jsx:3013), card rule trong Settings) nên không xoá key này.
- Đã verify qua `weekly-study-planner-ui-only-b` (cổng 5176, Vite thuần, không chạm DB thật): cả 3 card đều có icon nằm trái tiêu đề trên cùng 1 hàng (tâm lệch < 6px, icon 36×36), footer hiển thị đúng `Lĩnh vực: ... | <giờ>` (vd `Lĩnh vực: Chuyên môn 10:00 - 12:00`), không lỗi console; `npm run build` pass. **Vẫn không chụp được ảnh màn hình** (Browser pane không hiển thị trong phiên này).

### Tasks: đưa tiêu đề nhiệm vụ lên trên hàng badge giờ/icon
Người dùng gửi ảnh chụp 1 card trong menu Tasks, khoanh đỏ tiêu đề ("Học listening theo sách Collin") và yêu cầu chỉnh tiêu đề lên trên — trước đó hàng badge (giờ học + icon môn) nằm ở dòng đầu, tiêu đề nằm dưới.

- [src/App.jsx:1637](src/App.jsx:1637) (`TaskCard`): đảo thứ tự trong khối `.min-w-0` — `<h3>` tiêu đề lên đầu, khối badge giờ + icon xuống dưới; class của khối badge đổi `mb-3` → `mt-3` để khoảng cách vẫn 12px. Không đụng logic, không đổi gì khác.
- Đã verify bằng `weekly-study-planner-ui-only-b` (Vite thuần, cổng 5176, KHÔNG có `/api/*` nên không chạm DB thật): thứ tự DOM trong card là `H3` → `DIV` badge, vị trí h3 top 907.5 / badge top 975.5 (cách 12px), không có lỗi console. **Không chụp được ảnh màn hình** vì Browser pane không hiển thị trong phiên này (viewport 0x0, không compositing frame) — hạn chế môi trường đã gặp ở phiên trước.
- [.claude/launch.json](.claude/launch.json): thêm cấu hình thứ 3 `weekly-study-planner-ui-only-b` (cổng 5176) để chạy được preview khi cổng 5174 đang bị phiên chat khác chiếm.

### Thay toàn bộ UI style sang phong cách "sticker" teal/vàng/coral
Người dùng gửi 1 ảnh mockup app học tiếng Anh và yêu cầu: **giữ nguyên 100% tính năng, chỉ đổi UI style theo ảnh**; giữ nguyên layout desktop hiện tại (không bóp về mobile); làm hết một lượt rồi mới review.

Đặc điểm style mới: nền kem, thẻ bo góc lớn + **viền mảnh 1.5px màu đậm** kiểu sticker + bóng mềm, nút dạng viên thuốc (chính = teal đặc, phụ = viền nét đứt), chấm/đường phân cách nét đứt, nhãn pill viền đậm, gạch highlight vàng dưới từ khóa tiêu đề, font bo tròn.

- [tailwind.config.js](tailwind.config.js): thêm bảng màu mới `ink` (đen-xanh làm màu viền/chữ), `teal` (ghi đè teal mặc định), `sun`, `coral`, `sky`, `cream`, `paper`; thêm `fontFamily.sans = Nunito`, `fontFamily.display = Baloo 2`; `borderRadius.card = 1.375rem`; shadow `card`/`pop`/`chip`.
- [index.html](index.html): thêm link Google Fonts (Nunito + Baloo 2, có subset tiếng Việt).
- [src/index.css](src/index.css): thêm `@layer components` gồm `.card`, `.card-soft`, `.card-dashed`, `.btn` + biến thể (`.btn-primary/.btn-outline/.btn-sun/.btn-soft/.btn-coral/.btn-sm`), `.icon-btn`, `.icon-btn-coral`, `.pill`, `.progress-track`, `.progress-fill`; class `.marker` (gradient vàng kiểu bút dạ quang); đổi `.field-input` + `.study-note-preview` sang bảng màu mới.
- [src/App.jsx](src/App.jsx): rewrite className toàn bộ các view/modal (sidebar, Dashboard, Calendar, Tasks, TaskCard, Notes, Documents, Speaking, Testing, Settings, RuleCard, 5 modal, MiniCalendar, MonthControls, LegendDot, Field). `THEME_STYLES` **giữ nguyên key** (`orange/purple/blue/teal/slate` — đây là giá trị lưu trong DB) nhưng đổi class bên trong sang bảng màu mới (orange→sun, purple→coral, blue→sky, teal→teal, slate→ink). Màu highlight của nút "tô màu" trong editor đổi `#fef08a` → `#fbd95f`.
- **Không đụng tới logic**: không sửa state, hàm xử lý, `localStorage`, `/api/data`, cấu trúc dữ liệu. `grep` xác nhận không còn class màu cũ (`slate-/blue-/indigo-/rose-/amber-/emerald-/purple-/orange-`) trong `src/App.jsx`.
- [.claude/launch.json](.claude/launch.json): thêm cấu hình thứ 2 `weekly-study-planner-ui-only` (`npm run dev`, port 5174) — **chạy Vite thuần, không có `/api/*` nên không kết nối DB thật**, dùng cho các lần chỉ cần kiểm tra giao diện. Cấu hình `vercel dev` cũ (port 5173, có DB thật) vẫn giữ nguyên.
- Đã verify: `npm run build` pass; chạy `weekly-study-planner-ui-only` và click qua đủ 8 tab (Dashboard/Calendar/Tasks/Notes/Documents/Speaking/Testing/Settings) — không có lỗi console, app không unmount; mở + đóng modal "Thêm mục mới" OK; computed style xác nhận nền `#F4F2EE`, font Nunito đã load, nút chính bo tròn 9999px nền `#2F978F`, thẻ bo 22px viền `#1B2E31`, thanh tiến độ viền nét đứt + fill vàng `#FBD95F`, `.marker` có gradient vàng. **Chưa chụp được ảnh màn hình** do Browser pane không hiển thị trong phiên này.

### Master Notes: sắp xếp ghi chú mới thêm/sửa lên đầu
Người dùng muốn ở trang Master Notes (`NotesView`), note nào mới được thêm/sửa gần nhất thì hiển thị đầu tiên — trước đó danh sách chỉ sort theo ngày của task tăng dần (`allStoredTasks`), nên note thêm sau nhưng gắn ngày cũ hơn vẫn bị chìm xuống dưới.

- Thêm field mới `noteUpdatedAt` (ISO timestamp) trên task, set ở 3 chỗ ghi note: `createTask()` ([src/App.jsx:213](src/App.jsx:213), khi tạo task mới kèm note luôn), `updateTask()` ([src/App.jsx:758](src/App.jsx:758), khi patch có key `note` — dùng cho ô textarea sửa nhanh inline trong `TaskCard`), `saveFullNote()` ([src/App.jsx:904](src/App.jsx:904), khi lưu từ modal "Soạn ghi chú").
- `allNotes` ([src/App.jsx:643](src/App.jsx:643)) đổi từ `.filter()` đơn giản sang `useMemo` có `.sort()` giảm dần theo `noteUpdatedAt`, fallback về `task.date` cho note cũ chưa có timestamp (không cần migrate dữ liệu cũ).
- Đã verify qua `vercel dev`: 4 note thật hiện có (không có `noteUpdatedAt`, fallback theo date) hiển thị đúng thứ tự ngày giảm dần (07-23 → 07-16 → 07-14 → 07-14). Chỉ xem tab Notes, không sửa/lưu note nào nên dữ liệu thật không đổi.

### Giữ định dạng gốc khi dán (paste) vào editor Documents
Người dùng muốn khi dán nội dung có định dạng (từ Word, web, ...) vào ô soạn tài liệu thì giữ nguyên định dạng, thay vì bị ép về plain text như trước.

- `handlePaste` trong `DocumentModal` ([src/App.jsx:3244](src/App.jsx:3244)): nếu clipboard có `text/html` thì chèn bằng `execCommand('insertHTML', false, sanitizePastedHtml(html))`; nếu không có thì vẫn fallback về `text/plain` như cũ.
- Hàm mới `sanitizePastedHtml()` ([src/App.jsx:524](src/App.jsx:524)): dựng 1 `<div>` tạm, xóa hẳn các thẻ nguy hiểm (`script,style,link,meta,object,embed,iframe`) và strip mọi thuộc tính `on*` (onerror, onclick...) + `href`/`src` dạng `javascript:` — cần thiết vì nội dung dán được lưu thẳng vào `content` rồi hiển thị lại qua `dangerouslySetInnerHTML` ở danh sách/preview, nên phải chặn trước nguy cơ tự-XSS khi dán nội dung từ nguồn lạ.
- **Chỉ áp dụng cho Documents** — `FullNoteModal` (Notes) và Speaking vẫn cố ý ép plain text khi dán như quyết định trước đó, không đổi.
- Đã verify qua `vercel dev`: mô phỏng dán HTML có `<b>`, `<span style="color:red">` cùng `<script>` và `<img onerror>` độc hại — kết quả giữ đúng in đậm/màu chữ, `<script>` bị loại bỏ hoàn toàn, `onerror` bị strip khỏi `<img>`, không có mã nào chạy được (`window.__xssFired` vẫn `false`). Test trên tài liệu mới (chưa lưu) nên không ảnh hưởng dữ liệu thật.

### Sửa lỗi crash trắng trang khi xóa text trong editor "Sửa tài liệu"
Người dùng báo crash (trắng trang) khi bôi đen rồi xóa text trong modal Sửa tài liệu (Documents) vừa đổi sang WYSIWYG ở phiên trước.

**Nguyên nhân gốc**: `onInput` của `DocumentModal` đọc `event.currentTarget.innerHTML` **bên trong** hàm updater dạng function của `setDraft` — `setDraft((current) => ({ ...current, content: event.currentTarget.innerHTML }))`. React chủ động null hóa `event.currentTarget` sau khi handler đồng bộ chạy xong; nếu React xử lý hàm updater này trễ hơn 1 nhịp (dễ xảy ra khi thao tác xóa phức tạp — vd bôi đen xuyên ranh giới 2 đoạn `<p>` rồi xóa khiến `execCommand('delete')` merge DOM — kích hoạt nhiều lượt re-render dồn dập), `event.currentTarget` đã là `null` lúc updater thực thi → `TypeError: Cannot read properties of null (reading 'innerHTML')` → React unmount toàn bộ app (trắng trang, `#root` rỗng). `FullNoteModal`/Speaking không dính lỗi này vì đọc `event.currentTarget.innerHTML` **ngay lập tức** ở dạng giá trị (`setDraft(event.currentTarget.innerHTML)`), không bọc trong hàm updater.

**Sửa**: [src/App.jsx:3291](src/App.jsx:3291) — lấy `event.currentTarget.innerHTML` ra biến `html` ngay khi handler chạy, rồi mới truyền `html` (không phải `event`) vào hàm updater của `setDraft`.

**Cách tái hiện + verify**: dùng `document.execCommand('delete')` qua `javascript_tool` để chọn vùng xuyên ranh giới 2 thẻ `<p>`/`<li>` rồi xóa liên tục nhiều lần (lặp 8 lần) — trước khi sửa: crash ngay ở lần thứ 2; sau khi sửa: chạy đủ 8 lần không lỗi (`window.__errors` rỗng). Test qua `vercel dev` (DB thật) nhưng **không bấm "Lưu tài liệu"** trong lúc test, chỉ thao tác trong DOM rồi đóng modal — đã xác nhận nội dung tài liệu thật không đổi sau khi test.
**Lưu ý cho lần sau**: khi viết `onInput`/event handler nào đó dùng dạng `setX((current) => ...)` (functional updater), KHÔNG được đọc `event.currentTarget`/`event.target` bên trong thân hàm updater — luôn đọc ra biến local trước, ngoài hàm updater.

### Đổi editor "Sửa tài liệu" trong Documents sang WYSIWYG bôi-đen-để-format (mới nhất)
Người dùng muốn thêm editor cho phần Documents (trước đó vẫn là `<textarea>` markdown thô sau lần đơn giản hóa tách Xem/Sửa trước).

- `DocumentModal` ([src/App.jsx:3215](src/App.jsx:3215)): đổi `<textarea>` sang `<div contentEditable>` + 2 nút toolbar In đậm/Tô màu (`execCommand`), copy đúng pattern đã dùng cho `FullNoteModal`/Speaking (seed nội dung 1 lần qua `dataset.seeded`, paste ép plain text, `onMouseDown preventDefault` trên nút toolbar để không mất vùng bôi đen).
- Card danh sách tài liệu ([src/App.jsx:1894](src/App.jsx:1894)) và `DocumentViewModal` đổi từ `formatNoteHtml(doc.content)` sang `renderNoteHtml(doc.content)` để tương thích ngược: tài liệu cũ lưu markdown thô (`**bold**`, `- list`...) vẫn hiển thị đúng qua `formatNoteHtml`, tài liệu mới lưu HTML thật (từ editor mới) render thẳng.
- Đã verify qua `vercel dev`: modal Sửa mở đúng, nội dung tài liệu cũ ("Tình huống giao tiếp") seed đúng vào editor, toolbar hiện diện, tài liệu cũ vẫn hiển thị đúng ở danh sách/view modal sau khi đổi sang `renderNoteHtml`. **Chưa verify được** thao tác bôi đen + bấm nút trên UI thật do `vercel dev` local crash liên tục sau ~30-40s (lỗi native Windows không liên quan code: `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c` — môi trường flaky đã biết, không phải do thay đổi lần này). Đã xác nhận dọn sạch process node sau mỗi lần crash, không ảnh hưởng dữ liệu production.

### Notes: xem/sửa ghi chú trực tiếp từ Master Notes + đổi editor ghi chú task sang WYSIWYG
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
