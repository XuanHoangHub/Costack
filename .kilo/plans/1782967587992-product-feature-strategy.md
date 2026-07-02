# Product Feature Strategy — Avaxa Productivity OS (Refined v2)

## Executive Summary
**Avaxa Productivity OS** không cạnh tranh với Notion/ClickUp/Linear/Lark bằng "all-in-one đầy đủ".
Chiến lược: trở thành **AI-Native Productivity OS** duy nhất có giao diện Glassmorphic, offline-first, voice-ready và co-pilot ngữ cảnh toàn workspace.

### Unique Selling Propositions (USP)
1. **Glassmorphic Identity** — Giao diện trong suốt, fluid, tùy chỉnh màu accent theo workspace (Indigo/Ocean/Forest/Sunset). Đây là "brand moat" mà các đối thủ khó sao chép nhanh.
2. **Offline-First + Cloud Sync** — Hoạt động 100% không mạng, đồng bộ batch thông minh. Quan trọng với field workers, commuters, regions có mạng kém.
3. **Gemini Co-pilot sâu** — 10 endpoint AI đã tích hợp, không chỉ chatbot mà tóm tắt, generate, phân tích whiteboard, priority suggest...
4. **Sound Synthesizer** — Không cần asset audio, tạo sound feedback động bằng Web Audio API.

---

## 1. User Personas & Jobs-to-be-Done

| Persona | Mô tả | Jobs-to-be-Done |
|---|---|---|
| **Solo Creator** | Freelancer, content creator, startup founder 1 người | Quản lý tasks cá nhân, ghi chú meeting, lên kế hoạch nội dung, theo dõi time |
| **Startup Team (3-10 ppl)** | Team sản phẩm/digital agency nhỏ | Quản lý sprint, phối hợp real-time, chia sẻ docs, brainstorm whiteboard |
| **Knowledge Worker** | PM, consultant, researcher | Tổ chức tri thức (docs/wiki), tracking deadline, báo cáo năng suất |
| **Agency Manager** | Quản lý team 10-30 người | Phân quyền workspace, theo dõi tiến độ, audit trail, template reuse |

---

## 2. Competitive Gap Analysis

| Dimension | ClickUp | Notion | Linear | Lark | **Avaxa** |
|---|---|---|---|---|---|
| Task Hierarchy | Space → List → Task | DB only | Issue only | Multimode | **Space → List → Task** |
| Giao diện đẹp | 7/10 | 9/10 | 10/10 | 8/10 | **10/10 (Glassmorphic)** |
| Offline-first | Partial | No | No | Yes | **Yes (full mutation queue)** |
| AI depth | Chat only | AI fill | AI issues | Co-pilot | **10 endpoints AI** |
| Voice input | No | No | No | Yes | **Có thể thêm** |
| Whiteboard | ClickUp Whiteboard | No | No | Lark Board | **Custom canvas** |
| No-code DB | ClickUp DB | Notion DB | No | Lark Base | **Avaxa Base (5 views)** |
| Mã nguồn | Closed | Closed | Closed | Closed | **Own stack có thể customize** |
| Pricing | Expensive | Expensive | Mid | Expensive | **Freemium + Premium** |

**Kết luận**: Avaxa có thể chiến thắng ở segment **"AI-Native Glass OS for small teams"** bằng cách kết hợp đẹp mắt + offline + AI depth.

---

## 3. Feature Triage — MoSCoW Framework

### 3.1 Core MVP (Must Have) — Scope để ship
Đây là tính năng PHẢI có để giải quyết đau đớn chính: "Tôi mất thời gian chuyển đổi giữa nhiều tool, dữ liệu phân mảnh, thiếu AI hỗ trợ".

| Feature | Must / Should / Could / Won't | Rationale | Effort | Tech Notes |
|---|---|---|---|---|
| Auth + Workspace | **Must** | Security & isolation | M | Supabase Auth |
| Spaces/Lists/Tasks Kanban | **Must** | Core JTBD | M | Đã có |
| Global Search (Ctrl+K) | **Must** | Discoverability | S | Đã có |
| Docs Hub | **Must** | Knowledge management | M | Đã có |
| Chat Channels | **Must** | Team communication | M | Supabase Realtime |
| Whiteboard | **Must** | Brainstorming | L | Canvas API |
| Avaxa Brain (10 endpoints) | **Must** | Differentiator | XL | Gemini + Next.js API |
| Calendar View | **Must** | Deadline visibility | M | Đã có |
| Pomodoro + Notifications | **Must** | Focus management | M | Đã có |
| Offline Sync | **Must** | Reliability | XL | localStorage + batch upsert |
| **SUBTOTAL CORE** | | | **~XL** | |

### 3.2 Enhanced (Should Have) — Competitive parity
Những tính năng cần có để không thua kế so với các đối thủ maintainer-level.

| Feature | MoSCoW | Rationale | Effort | Dependencies |
|---|---|---|---|---|
| Keyboard Shortcuts | **Should** | Power-user efficiency | M | Hook system |
| Command Palette | **Should** | Quick actions | M | Extend search modal |
| Drag & Drop wide | **Should** | UX fluidity | S | @hello-pangea/dnd đã có |
| Inline Editing | **Should** | Reduce modal friction | M | ContentEditable / input swap |
| Bulk Actions | **Should** | Mass operations | M | Selection state |
| Dependencies UI | **Should** | Task relationships | M | DB đã có `dependencies` |
| Time Tracking | **Should** | Billable / focus data | M | ClickApps + Timer UI |
| Custom Field Builder | **Should** | Data flexibility | L | DB `custom_fields` JSON |
| Calendar 2-way Sync | **Should** | Ecosystem | M | Google Calendar OAuth |
| Template Library | **Should** | Onboarding speed | M | JSON templates |
| Advanced Filters | **Should** | Precision | M | Query builder |
| Smart Reminders | **Should** | Proactive UX | M | Push / local notification |
| File Attachments | **Should** | Context sharing | M | Supabase Storage |
| Comments + Mentions | **Should** | Async discussion | M | Realtime subscription |
| Analytics + Export | **Should** | Decision making | M | recharts + CSV lib |
| Workspace Settings + Invite | **Should** | Team scaling | M | Member management |
| Mobile Responsive | **Should** | Device agnostic | XL | Layout refactor |
| Activity Log | **Should** | Trust & audit | M | Unified feed UI |
| Dark Mode | **Could** | Preference | S | State đã có, chỉ enable |
| Gantt View | **Could** | Planning | M | Timeline lib |
| Recurring Tasks UI | **Could** | Routine work | S | DB đã có `recurrence` |

### 3.3 Breakthrough (Could/Won't →变大) — Moat builders
Tính năng tạo khác biệt khó sao chép.

| Feature | Target Phase | Impact | Effort | Difficulty |
|---|---|---|---|---|
| AI Co-pilot Contextual (RAG) | Phase 3 | High | XL | Hard (vector DB, embedding) |
| Voice-First Commands | Phase 3 | Medium | L | Medium (Web Speech API) |
| Smart Automation Engine | Phase 3 | High | XL | Hard (event bus, cron) |
| NL Task Entry (Smart Parse) | Phase 2 | Medium | M | Medium (Gemini structured output) |
| Predictive Wellness | Phase 3 | Medium | L | Medium (analytics + heuristics) |
| Productive Archetype + Gamification | Phase 4 | Medium | XL | Medium |
| Cross-Device Handoff | Phase 4 | Low | L | Medium (PWA) |
| Digital Twin Workspace | Phase 4 | Low | XL | Hard |

---

## 4. Tighter Roadmap với Scope Control

### Phase 0 — Stabilize Core (0-6 tuần) *[PREREQUISITE]*
> Mục tiêu: Ứng dụng chạy ổn định, không lỗi chồng chéo UI, RLS & Indexes đã fix.

- [ ] Fix Supabase RLS policies: rewrite dùng `(select auth.uid())` theo advisor
- [ ] Thêm indexes cho FKs: `user_id`, `space_id`, `workspace_id`, `list_id` trên tasks/docs/members/whiteboard_elements
- [ ] Refactor `app/page.tsx` từ 5000 dòng → split thành `features/` modules (mỗi feature 1 folder, 1 provider nhỏ)
- [ ] Rút gọn state trong App: chuyển sang Zustand store cho `tasks`, `docs`, `spaces`, `notifications`, `ui`
- [ ] Tắt log console thừa, add error boundary

**Deliverable**: Build sạch, unchunk, không crash khi re-render.

### Phase 1 — Enhanced UX (6-16 tuần)
> Mục tiêu: "Như ClickUp nhưng đẹp hơn và AI tốt hơn".

| Feature | Tuần | Owner | Acceptance Criteria |
|---|---|---|---|
| Keyboard Shortcuts + Help modal | 6-7 | FE | Cmd+Shift+A create task; Cmd+Shift+Space toggle pomo; Help modal overlay |
| Inline Editing (task/doc/list name) | 7-8 | FE | Click text → editable input; blur/enter saves; escape cancels |
| Bulk Actions (select + toolbar) | 8-9 | FE | Checkbox lên header; bulk delete/status/assign/tag; confirm dialog |
| Task Dependencies UI | 9-11 | FE | Arrow SVG connector; blocked-by check; blocker can't complete if dependent incomplete |
| Time Tracking (timer + log) | 10-12 | FE + BE | Start/stop button; aggregate hoursLogged; show vs hoursEstimate in details |
| File Attachments | 11-12 | FE + BE | Drag-drop + button; Supabase Storage `attachments` bucket; preview modal |
| Comments + Mentions | 12-14 | FE + BE | Thread UI; @mention dropdown; realtime subscription supabase channel |
| Mobile Responsive | 13-16 | FE | Tailwind md/lg breakpoints; bottom nav on mobile; touch targets min 44px |
| Dark Mode Toggle | 14 | FE | Re-enable state; toggle in Settings; persist localStorage |
| Advanced Filters + Saved Views | 15-16 | FE | Filter bar; save view; load view by name |

**Deliverable**: Feature parity với Linear/ClickUp cơ bản.

### Phase 2 — Team & Intelligence (16-28 tuần)
> Mục tiêu: Trở thành "must-have" cho startup team.

| Feature | Tuần | Owner | Acceptance Criteria |
|---|---|---|---|
| NL Task Entry (Smart Parse) | 16-18 | FE+AI | Input "Gặp marketing 14h mai" → auto-fill title/dueDate/priority |
| Calendar 2-way Sync | 17-19 | FE+BE | OAuth flow; push task events; pull calendar events into timeline |
| Template Library | 18-20 | FE | Templates cho Space, List, Task, Doc; "Save as Template" button |
| Real-time Presence + Cursors | 19-21 | FE+BE | Presence badge; cursor broadcast on Whiteboard via Realtime |
| Command Palette Expansion | 20-21 | FE | Palette search + execute; fuzzy search; recent actions |
| Advanced Analytics + Export | 21-23 | FE | More charts; CSV export; PDF via @react-pdf/report |
| Workspace Invite + Roles | 22-24 | FE+BE | Email invite link; role editor/viewer; pending invites list |
| Activity Log Unified | 24-25 | FE | Single timeline view; filters by entity/date/user |
| Automation Engine (Basic) | 25-28 | FE+BE | Visual builder: WHEN X → DO Y; 5 built-in templates |

**Deliverable**: Team adoption >40%.

### Phase 3 — Differentiation (28-44 tuần)
> Mục tiêu: Khác biệt AI mà không ai sao chép nhanh được.

| Feature | Tuần | Owner | Acceptance Criteria |
|---|---|---|---|
| AI Co-pilot Contextual (RAG) | 28-34 | AI+BE | Vectorize docs/tasks/chat; daily plan suggestion; retask priority |
| Voice-First Commands | 32-36 | FE+AI | Web Speech API wrapper; voice-to-task; voice-chat reply |
| Smart Automation (Advanced) | 35-40 | BE | Cron triggers; webhooks; conditional branches; run history log |
| Predictive Wellness Insights | 40-44 | AI+FE | Wellness score; burnout risk flag; focus recommendation |

**Deliverable**: Lợi thế công nghệ rõ rệt.

### Phase 4 — Gamification & Ecosystem (44+ tuần)
> Mục tiêu: Retention + community.

| Feature | Tuần | Owner | Acceptance Criteria |
|---|---|---|---|
| Productivity Archetype | 44-48 | AI+FE | Classification quiz; weekly archetype update; insights report |
| Cross-Device Handoff | 48-52 | FE | PWA install; clipboard sync; QR hand-off |
| Digital Twin | 52-60 | BE+FE | Clone workspace; sandbox mode; rollback |
| Collaborative Playground | 60+ | BE+FE | Live room; shared canvas; voice channel |

---

## 5. Data Model & Schema Changes theo Phase

### Phase 0
```sql
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_space_id ON tasks(space_id);
CREATE INDEX idx_tasks_list_id ON tasks(list_id);
-- tương tự docs, members, lists, whiteboard_elements
```

### Phase 1
```sql
-- Attachments
CREATE TABLE task_attachments (
  id text PRIMARY KEY,
  task_id text REFERENCES tasks(id),
  name text, file_path text, size int, uploaded_at text,
  user_id uuid REFERENCES auth.users(id)
);

-- Time entries
CREATE TABLE time_entries (
  id text PRIMARY KEY,
  task_id text REFERENCES tasks(id),
  user_id uuid REFERENCES auth.users(id),
  start_time timestamptz, end_time timestamptz, duration_minutes int
);

-- Comments
CREATE TABLE task_comments (
  id text PRIMARY KEY,
  task_id text REFERENCES tasks(id),
  user_id uuid REFERENCES auth.users(id),
  content text, parent_id text, mentions text[], created_at timestamptz
);
```

### Phase 2
```sql
-- Templates
CREATE TABLE templates (
  id text PRIMARY KEY, type text, name text, content jsonb, user_id uuid, is_public bool
);

-- Saved Views
CREATE TABLE saved_views (
  id text PRIMARY KEY, space_id text, list_id text, name text, config jsonb, user_id uuid
);

-- Invites
CREATE TABLE workspace_invites (
  id text PRIMARY KEY, workspace_id text, email text, role text, token text, expires_at timestamptz
);
```

### Phase 3
```sql
-- Embeddings for RAG (nếu dùng pgvector)
CREATE TABLE document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id text, chunk text, embedding vector(768), user_id uuid
);
CREATE INDEX idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Automations
CREATE TABLE automations (
  id text PRIMARY KEY, workspace_id text, name text, trigger jsonb, actions jsonb, enabled bool, user_id uuid
);
```

### Phase 4
```sql
-- Gamification
CREATE TABLE user_stats (
  user_id uuid PRIMARY KEY, xp int, level int, streak int, archetype text, last_active date
);

-- Twin workspaces
CREATE TABLE workspace_twins (
  id text PRIMARY KEY, source_workspace_id text, name text, state jsonb, created_at timestamptz
);
```

---

## 6. Giao diện & Design System Alignment
Phần này đảm bảo mọi tính năng mới đều phù hợp với **"Glassmorphic White OS"**.

| Design Token | Giá trị hiện tại | Áp dụng cho tính năng mới |
|---|---|---|
| **Aesthetic** | White space, glass blur, soft shadow | Mọi modal, panel, card phải có `bg-white/90 backdrop-blur` |
| **Accent Presets** | indigo / ocean / forest / sunset | Mỗi feature cần dùng CSS variables `var(--avaxa-*)` |
| **Typography** | Inter/system, tight tracking | Tiêu đề section dùng `font-bold text-xs uppercase tracking-wide` |
| **Motion** | Framer Motion, layoutId cho shared element | Transitions phải smooth, duration 200-300ms |
| **Sound** | Web Audio synthesizer | Feedback âm thanh cho success/delete/toggle/notification |
| **Blur Intensity** | soft/default/immersive | Cung cấp setting cho các panel mới |

**Không được**: thêm flat design, dark mode mặc định (user yêu cầu forced light), shadow cứng >1px.

---

## 7. Pricing & Tier Mapping

Avaxa có logic premium sẵn. Cần align features với tiers rõ ràng.

| Tier | Price | Core | Enhanced | Breakthrough | Other |
|---|---|---|---|---|---|
| **Free (Starter)** | $0/user/mo | Workspace, Tasks, Docs, Chat, Whiteboard, Calendar, Pomodoro, Offline Sync | Search, Inline Edit, D&D, Basic Filters | — | Ads? |
| **Pro (Premium)** | $9/user/mo | **Everything in Free** | Bulk Actions, Dependencies, Time Tracking, Attachments, Comments, Analytics, Templates, Calendar 2-way | NL Task Entry, Smart Reminders, Basic Automation | Priority support |
| **Team** | $19/user/mo | **Everything in Pro** | Invite Members, Roles, Advanced Filters, Activity Log, Shared Views | AI Co-pilot (1 user), Voice Commands, Automation Engine | Admin panel |
| **Enterprise** | Custom | **Everything** | SSO (SAML/OIDC), Audit Log Export, Compliance, Dedicated support | AI Co-pilot (all users), Voice, Advanced Automation, RAG, Playground | SLA |

**Note**: Current code có `localStorage('avaxa_premium')` và `isPremium`. Cần map sang product tiers thực tế.

---

## 8. Risk Register & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **God Component (page.tsx 5000 dòng)** | High | High | Phase 0 refactor sang feature modules + Zustand |
| **State Management explosion** | High | High | Zustand slices: tasks, docs, spaces, ui, notifications |
| **AI costs (Gemini)** | Medium | High | Cache responses; rate limit per user; fallback graceful; Edge Function proxy |
| **Supabase row limits / costs** | Medium | Medium | Pagination; soft delete; archive old sync logs |
| **Performance on large datasets** | Medium | Medium | Virtualization (react-virtuoso); prevent re-render; React Compiler Next.js 16 |
| **Feature creep** | High | High | Strict MoSCoW; freeze scope per phase; cut non-essential |
| **Mobile experience** | Medium | Medium | Responsive audit Phase 1; bottom nav; PWA manifest Phase 2 |
| **Backup & Disaster** | Low | Critical | Supabase point-in-time recovery; export configuration to git |
| **Security (RLS, secrets)** | Medium | Critical | Fix advisor warnings; never log secrets; Edge Function for AI proxy |

---

## 9. Go-to-Market Strategy (High Level)

1. **Pre-launch**: Invite-only beta cho 50-100 startup founders (Product Hunt, Vietnamese tech communities). Mục tiêu feedback sâu.
2. **Launch**: PSA (Product Hunt Alternative) + LinkedIn personal brand. Content: "How I replaced ClickUp + Notion + Miro + ChatGPT with one Glass OS".
3. **Growth**: Template marketplace (free templates SEO); AI use-case demos; referral program (1 month free).
4. **Retention**: Weekly AI Briefing email; Wellness insights; Streaks & Archetypes.

---

## 10. Success Metrics (OKRs)

### Q3 2026 (Phase 0-1)
- **O**: Deliver stable, delightful Core+Enhanced ready for public beta.
  - KR1: Zero critical bugs in production (Crash-free sessions >99.5%)
  - KR2: `app/page.tsx` reduced to <1500 lines per file via modularization
  - KR3: Core actions (create task, switch space, send message) <200ms perceived latency

### Q4 2026 (Phase 1 complete)
- **O**: Reach product-market fit with solo creators & small teams.
  - KR1: DAU/MAU >50%
  - KR2: Task completion rate per user >3 tasks/day
  - KR3: NPS >40
  - KR4: Offline sync success rate >99.5%

### Q1 2027 (Phase 2 complete)
- **O**: Become team productivity standard for startups.
  - KR1: Workspace size avg >5 members
  - KR2: AI commands per user >10/week
  - KR3: 40% users use Templates + Saved Views
  - KR4: Team plan conversion >15%

### Q2 2027 (Phase 3 complete)
- **O**: Establish AI-native moat.
  - KR1: Voice command adoption >25%
  - KR2: Automation active users >30%
  - KR3: Time-to-task creation reduced 40% via NL entry
  - KR4: Churn <2%/month (Pro+Team)

---

## 11. Rapid Prototyping Checklist (trước khi code)
- [ ] **User Research**: Interview 10 target users về workflow hiện tại + pain points
- [ ] **Competitor Teardown**: Deep dive Notion AI, ClickUp Brain, Linear, Lark Base
- [ ] **Design System Audit**: Inventory tất cả modal/panel/button styles hiện có; document token dùng Tailwind v4
- [ ] **Architecture Review**: Vẽ sơ đồ state flow; xác định Zustand stores
- [ ] **Sprint 0 Plan**: Chọn 5 tính năng Phase 1 đầu tiên để implement trong 2 sprints
- [ ] **Analytics Setup**: PostHog / Mixpanel / Supabase Analytics để track events ngay từ đầu

---

*Lần cuối cập nhật: 2026-07-02*
*Tác giả đề xuất: Kilo (PM perspective)*
