# Handoff — Weekly Study Planner

Ghi lại bối cảnh phiên làm việc gần nhất để phiên sau (người hoặc AI) có đủ thông tin tiếp tục, không phải dò lại từ đầu.

## Thông tin project

- Local source: `C:\Users\lenovo\Documents\Codex\2026-06-02\b-n-c-n-nh-app\work\weekly-study-planner`
- GitHub: https://github.com/DoanLy/weekly-study-planner.git (branch `main`)
- Vercel project: `files-mentioned-by-the-user-weeklyplanner` (org `doanlys-projects`), production tại https://files-mentioned-by-the-user-weeklyp.vercel.app/
- Toàn bộ UI nằm trong 1 file: `src/App.jsx` (~2100 dòng, React + Vite + Tailwind + lucide-react)
- Data lưu trong `localStorage` (key `weekly-study-planner-data`) và đồng bộ 2 chiều với Google Apps Script endpoint (`SHEETS_ENDPOINT` trong `App.jsx`)

## Trạng thái git tại thời điểm handoff

- Commit gần nhất **đã push**: `91977e6` — "Remove AI Refine, add schedule rule list management in Settings"
- **Đang có thay đổi CHƯA COMMIT** trong `src/App.jsx`: chuyển lịch mặc định (Mon/Wed/Fri, Tue/Thu/Sat, Chủ Nhật) từ hard-code sang rule động (xem chi tiết bên dưới). Cần review rồi commit + push khi người dùng xác nhận.

## Các việc đã hoàn thành trong phiên này (theo thứ tự)

### 1. Bỏ tính năng "AI Refine" (đã commit ở `91977e6`)
Tính năng cũ (`refineNote`, nút "AI Refine" với icon `WandSparkles` trong `TaskCard`) chỉ định dạng lại ghi chú thành gạch đầu dòng, không gọi API AI ngoài nào — nên xóa gọn, không có tác dụng phụ.

### 2. Rule list trong Settings (đã commit ở `91977e6`)
`SettingsView` giờ hiển thị toàn bộ `data.scheduleRules` dưới dạng `RuleCard` (khoảng ngày, thứ áp dụng, giờ, badge "Đã apply N buổi", nút Sửa/Xóa). Trước đó tính năng này đã có sẵn code (uncommitted từ phiên trước đó nữa) — phiên này chỉ dọn dead code (xóa hàm `LegacySettingsView` không còn được render).

### 3. Biến lịch mặc định thành rule động (CHƯA COMMIT)
Trước đây `getDefaultTasks(date)` hard-code 3 khung lịch cố định (không hiện trong Settings, không sửa/xóa được). Đã refactor thành:

- **7 rule seed** (`DEFAULT_RULE_SEEDS`) tương ứng đúng lịch cũ:
  - T2/T4/T6: "Làm bài tập & Ôn bài cũ + mới" (10:00–12:00), "Học clip thầy Tùng" (13:00–16:00), "Dịch Anh-Việt & Việt-Anh" (21:00–23:00)
  - T3/T5/T7: "Học auto" (10:00–12:00), "Học auto" (13:00–17:00), "Listen & Speak" (20:00–22:00)
  - CN: "Nghỉ ngơi" (không có giờ cụ thể)
  - Khoảng ngày mỗi rule: `2020-01-01` → `2035-12-31` (coi như áp dụng vĩnh viễn, sửa được trong Settings nếu muốn thu hẹp)
- **Seed 1 lần duy nhất**: `ensureDefaultRules(data)` chèn 7 rule trên vào `scheduleRules` nếu `data.defaultRulesSeeded` chưa `true`, rồi đánh dấu `true`. Chạy tại: khởi tạo state từ `localStorage`, và sau khi load remote từ Google Sheets. `clearAllData()` set `defaultRulesSeeded: true` ngay sau khi xóa để **không tự sinh lại** 7 rule mặc định sau khi người dùng chủ động xóa sạch dữ liệu.
- **Tính lịch động thay vì bake sẵn**: `getTasksForDate(data, date)` giờ ưu tiên `data.dailyTasks[dateStr]` nếu đã có (nghĩa là ngày đó người dùng từng sửa/tick/note), nếu chưa thì gọi `getRuleGeneratedTasks(data.scheduleRules, date)` để tính trực tiếp từ mọi rule khớp ngày đó (kể cả rule người dùng tự tạo thêm). **Không còn bake hàng nghìn ngày vào storage** — tránh phình dữ liệu khi sync Google Sheets.
- `applyRuleToDailyTasks` (dùng khi tạo/sửa rule qua form) giờ chỉ tính `appliedCount` (số buổi rule sẽ khớp trong khoảng ngày) + dọn các task đã bake theo `ruleId` cũ (từ hệ thống cũ trước refactor), **không còn ghi task vào từng ngày** nữa.

**Đã verify bằng cách nào**: không dùng được browser preview trong phiên (tool preview bị khoá vào project khác trên máy). Đã verify bằng:
- `npm run build` chạy sạch không lỗi.
- Script Node độc lập trích xuất các hàm thuần (`getRuleGeneratedTasks`, `countRuleOccurrences`, `buildDefaultRule`) để mô phỏng lịch cho vài ngày mẫu (T2, T3, T4, CN) — kết quả khớp đúng lịch cũ.

**Đánh đổi/hạn chế đã biết (chưa xử lý, cần lưu ý nếu làm tiếp)**:
- Nếu người dùng **sửa** 1 trong 7 rule mặc định qua form Settings, icon gốc (`book`, `headphones`, `language`, `bot`, `graduation`) sẽ bị ghi đè thành `mic`/`code` chung chung — vì `buildRuleFromForm` tính icon qua `getRuleIcon(theme)` (map thô theo theme), không giữ icon gốc. Đây là hạn chế có sẵn của form tạo rule (áp dụng cho mọi rule, không riêng gì 7 rule mặc định).
- Rule "Nghỉ ngơi" (Chủ Nhật) không có `start`/`end` (để trống) nên task hiển thị không có badge giờ — khác với bản cũ ghi cứng "Cả ngày". Chưa xử lý vì input giờ dạng `type="time"` không nhận text tự do.
- Nếu Google Sheets đang lưu data từ **trước** bản refactor này (không có field `defaultRulesSeeded`/7 rule mặc định) và local đã chạy bản mới, có thể có tình huống 2 nguồn lệch nhau tạm thời cho tới khi sync xong theo 1 chiều — chưa test kỹ tình huống multi-device/multi-tab.

## Việc cần làm tiếp (nếu người dùng đồng ý)

1. Review + **commit + push** thay đổi "rule động thay lịch mặc định" (`src/App.jsx`, hiện chưa commit).
2. Cân nhắc cập nhật `README.md` (dòng 18-20 nhắc tới tính năng "pin tuần" cũ, có vẻ không còn khớp với UI "StudyFlow" hiện tại — chưa kiểm tra kỹ).
3. Nếu muốn xử lý hạn chế icon khi sửa rule mặc định, cần thêm field `icon` riêng vào form Settings hoặc giữ icon gốc khi `existingRule` có sẵn icon hợp lệ.
