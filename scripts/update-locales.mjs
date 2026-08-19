import fs from 'fs';

// Complete dictionary additions
const additionalEn = {
  // Missing 13 keys
  aiSubtask: 'AI Subtasks',
  generateReport: 'Generate Report',
  productivityReport: 'Productivity Report',
  morningBriefing: 'Morning Briefing',
  personalization: 'Personalization',
  notificationSettings: 'Notification Settings',
  resetDefaults: 'Reset to Defaults',
  optionNamePlaceholder: 'Option name...',
  deleteOption: 'Delete option',
  moveUp: 'Move up',
  moveDown: 'Move down',
  pickColor: 'Pick color',
  minOptionWarning: 'Must have at least 1 option in the list',

  // Settings Panel Navigation & Tabs
  settingsSubtitle: 'Workspace Control Center',
  searchSettings: 'Search settings...',
  workspaceCategory: 'Workspace',
  personalCategory: 'Personal',
  settingsGeneral: 'Workspace',
  settingsGeneralDesc: 'Identity and branding',
  settingsPeople: 'Members',
  settingsPeopleDesc: 'Members and access permissions',
  settingsAi: 'Apexa AI',
  settingsAiDesc: 'AI Copilot & model configuration',
  settingsAuditLogs: 'Activity Log',
  settingsAuditLogsDesc: 'Events and history in workspace',
  settingsDataExport: 'Data & Storage',
  settingsDataExportDesc: 'Export data and backups',
  settingsPreferences: 'Appearance',
  settingsPreferencesDesc: 'Theme, language and visuals',
  settingsNotifications: 'Notifications',
  settingsNotificationsDesc: 'Alerts and focus mode',
  settingsSecurity: 'Security',
  settingsSecurityDesc: 'Account, sessions and authentication',

  // General & Appearance
  workspaceIdentity: 'Workspace Identity',
  workspaceIdentityDesc: 'Manage name, branding and default settings for your team.',
  createWorkspaceBtn: 'Create Workspace',
  basicInformation: 'Basic Information',
  basicInformationDesc: 'Use a clear name and memorable logo.',
  brandColor: 'Brand Color',
  dangerZoneTitle: 'Danger Zone',
  dangerZoneDesc: 'These actions are permanent and affect all members.',
  deleteThisWorkspace: 'Delete this workspace',
  deleteThisWorkspaceDesc: 'Permanently delete this workspace and all associated data.',
  noWorkspaceSelected: 'No workspace selected',
  membersAndAccess: 'Members & Access',
  membersAndAccessDesc: 'Invite teammates, manage departments and organize work.',
  appearanceAndTheme: 'Appearance & Experience',
  appearanceAndThemeDesc: 'Tailor Apexa to your environment and focus preferences.',
  colorMode: 'Color Mode',
  colorModeDesc: 'Choose the most comfortable view for your workday.',
  lightMode: 'Light',
  darkMode: 'Dark',
  systemMode: 'System',
  systemModeDesc: 'Follows device setting · currently {mode}',
  accentAndEffects: 'Accent & Effects',
  accentAndEffectsDesc: 'Highlight key actions without visual clutter.',
  interfaceDepth: 'Interface Depth',
  depthSoft: 'Soft',
  depthBalanced: 'Balanced',
  depthImmersive: 'Immersive',
  uiSounds: 'Interface Sounds',
  uiSoundsDesc: 'Play subtle audio feedback for key interactions.',
  languageAndRegion: 'Language & Region',
  languageAndRegionDesc: 'Choose your preferred interface language for Apexa OS.',
  displayLanguage: 'Display Language',
  displayLanguageDesc: 'Primary language for Apexa interface.',
  languageVietnamese: 'Tiếng Việt',
  languageVietnameseDesc: 'Vietnamese (Vietnam)',
  languageEnglish: 'English',
  languageEnglishDesc: 'English (United States)',
  languageSwitchSuccess: 'Language updated successfully',
  selectLanguage: 'Select Language',
  systemOperational: 'System Operational',
  systemOperationalDesc: 'All systems functioning normally',
  exportReady: 'Data Ready',
  exportReadyDesc: 'JSON backup has been downloaded to your device.',
  exportDataBtn: 'Export JSON Data',
  exportWorkspaceData: 'Export Workspace Data',
  exportWorkspaceDataDesc: 'Download all tasks, documents and member data as a JSON file.',

  // AI & Gemini Settings
  freeApiKeyNotice: 'Connect your Gemini API Key freely',
  freeApiKeyNoticeDesc: 'API keys are stored locally on your device and activate AI assistance, task generation, doc summaries and reporting.',
  getFreeApiKey: 'Get free Gemini API Key at Google AI Studio ↗',
  connectGeminiTitle: 'Gemini API Connection',
  connectGeminiDesc: 'Configure API key and model for Apexa AI.',
  apiKeyLabel: 'Gemini API Key',
  apiKeyPlaceholder: 'Paste your API key (AIzaSy...)',
  apiKeySavedLocally: 'Your API key is stored safely in localStorage on this browser.',
  aiModelLabel: 'AI Model',
  temperatureLabel: 'Creativity (Temperature)',
  temperaturePrecise: 'Precise (0.2)',
  temperatureBalanced: 'Balanced (0.7)',
  temperatureCreative: 'Creative (1.0)',
  searchGrounding: 'Google Search Grounding',
  searchGroundingDesc: 'Allow AI to browse live web data for accurate context.',
  dailyBriefingToggle: 'Daily Morning Briefing',
  dailyBriefingToggleDesc: 'Automatically analyze overdue and upcoming tasks each morning.',
  briefingTime: 'Briefing Time',
  testAiConnectionBtn: 'Test Connection',
  testingAiConnection: 'Testing connection...',
  aiConnectedSuccess: 'Gemini AI connected successfully',
  aiConnectedSuccessDesc: 'Model {model} is active and ready to assist.',

  // Notifications Fine-Tuning
  notificationDelivery: 'Notification Delivery',
  notificationDeliveryDesc: 'Control all notification alerts on this device.',
  enableAllNotifications: 'Enable Notifications',
  enableAllNotificationsDesc: 'Receive activity updates and reminders.',
  enableNotificationSound: 'Notification Sound',
  enableNotificationSoundDesc: 'Play a chime when a notification arrives.',
  onlyImportantUpdates: 'Only Important Updates',
  onlyImportantUpdatesDesc: 'Reduce noise by prioritizing assignments and deadlines.',
  notificationContentTitle: 'Notification Triggers',
  notificationContentSubtitle: 'Fine-tune which activities can interrupt your focus.',
  notifyAssignments: 'New Assignments',
  notifyAssignmentsDesc: 'When a new task is assigned to you',
  notifyDeadlines: 'Deadlines',
  notifyDeadlinesDesc: 'Reminders for due soon and overdue tasks',
  notifyComments: 'Comments & Mentions',
  notifyCommentsDesc: 'Replies and @mentions in discussions',
  notifyStatusChanges: 'Status Changes',
  notifyStatusChangesDesc: 'Progress updates on tasks you are tracking',
  notifyFilteringTags: 'Tag Activity',
  notifyFilteringTagsDesc: 'Updates on tagged items you follow',
  notifyChatMessages: 'Chat Messages',
  notifyChatMessagesDesc: 'New messages in team chat rooms',
  notifySystemEvents: 'System Events',
  notifySystemEventsDesc: 'Sync, security and account alerts',
  focusSchedule: 'Focus Schedule',
  focusScheduleDesc: 'Automatically mute non-urgent alerts during deep work.',
  quietHours: 'Quiet Hours',
  quietHoursDesc: 'Set recurring daily quiet focus hours.',
  quietStart: 'Start',
  quietEnd: 'End',
  alertFrequency: 'Alert Frequency',
  alertFrequencyDesc: 'Group notifications to minimize disruptions.',
  freqAll: 'All updates',
  freqThrottled: 'Smart throttling',
  freqMinimal: 'Minimal only',

  // Task Statuses & Details
  taskStatusTodo: 'To Do',
  taskStatusInProgress: 'In Progress',
  taskStatusReview: 'In Review',
  taskStatusDone: 'Completed',
  priorityUrgent: 'Urgent',
  priorityHigh: 'High',
  priorityMedium: 'Medium',
  priorityLow: 'Low',
  unassigned: 'Unassigned',
  assigneesCount: '{count} assignees',
  bulkDeleteTitle: 'Bulk Delete Tasks',
  bulkDeleteConfirm: 'Are you sure you want to delete {count} selected tasks? This action cannot be undone.',
  bulkDeleteBtn: 'Delete {count} tasks',
  duplicateTask: 'Duplicate Task',
  duplicatedTaskSuccess: 'Created copy of "{title}"',
  copyTaskSuffix: '(Copy)',
  groupByStatus: 'Group by Status',
  groupByPriority: 'Group by Priority',
  groupByAssignee: 'Group by Assignee',
  showTaskList: 'Show task list panel',
  hideTaskList: 'Hide task list panel',
  startTimerTooltip: 'Start timer',
  stopTimerTooltip: 'Stop timer',
  timerLoggedSuccess: 'Added {hours}h to "{title}"',
  timerStoppedNoTime: 'No time logged (under 1 minute)',
  freePlanLimitSpaces: 'Free plan is limited to 5 Spaces. Please upgrade to Pro for unlimited Spaces!',
  freePlanLimitTitle: 'Free Plan Limit',
  spaceCreatedSuccess: 'Space "{name}" created successfully! 🎉',
  folderCreatedSuccess: 'Created folder "{name}"',
  documentCreatedSuccess: 'Created document "{title}"',
  whiteboardCreatedSuccess: 'Created whiteboard "{name}"',
  listCreatedSuccess: 'Created list "{name}"',
  pomodoroActiveToast: 'Pomodoro {mode} active for {minutes}m. Muting non-critical alerts.',
  pomodoroPausedToast: 'Pomodoro timer paused.',
  pomodoroEndedToast: 'Pomodoro finished. Restored notifications.',

  // Landing Page Copy
  landingHeroBadge: 'Next-Gen All-In-One Workspace',
  landingHeroTitle1: 'Work Smarter,',
  landingHeroTitle2: 'Execute Faster.',
  landingHeroDesc: 'A unified high-performance platform combining Tasks, Smart Docs, Infinite Whiteboards, Real-time Chat, AI Copilot and Analytics into a blazing-fast local-first experience.',
  landingStartFree: 'Get Started Free',
  landingExploreDemo: 'Explore Live Demo',
  landingNoCreditCard: 'No credit card required · Free forever tier',
  landingFeaturesTitle: 'Everything Your Team Needs to Excel',
  landingFeaturesSubtitle: 'Replace dozens of disconnected tools with a cohesive, ultra-fast workspace.',
  landingPricingTitle: 'Simple, Transparent Pricing',
  landingPricingSubtitle: 'Start free and scale effortlessly as your organization grows.',
  landingFaqTitle: 'Frequently Asked Questions',
  landingFaqSubtitle: 'Got questions? We have answers.',
  landingTestimonialsTitle: 'Loved by Modern Product Teams',
  landingTestimonialsSubtitle: 'Discover how top engineering and design teams ship faster with Apexa.',
  landingFooterTagline: 'The unified operating system for high-velocity teams.',
  landingRightsReserved: 'All rights reserved.',
  categoryAll: 'All Solutions',
  categoryTask: 'Project & Sprint Management',
  categoryAi: 'Apexa Brain AI Copilot',
  categoryCollaboration: 'Real-Time Collaboration',
  categoryAnalytics: 'Analytics & Performance',

  // Time formatting helpers
  timeJustNow: 'Just now',
  timeMinutesAgo: '{count}m ago',
  timeHoursAgo: '{count}h ago',
  timeYesterday: 'Yesterday',
  timeDaysAgo: '{count}d ago',
  timeOverdueYesterday: 'Overdue yesterday',
  timeOverdueDays: 'Overdue by {count} days',

  // Hubs
  financeHub: 'Finance & Invoicing',
  goalsHub: 'Goals & OKRs',
  inboxHub: 'Notifications & Inbox',
  analyticsHub: 'Performance Analytics',
  crmWorkspace: 'CRM & Pipeline',
  baseHub: 'Apexa Base (Database)',
  teamCommandCenter: 'Team Command Center',
  whiteboardCanvas: 'Infinite Whiteboard',
  docsHub: 'Collaborative Docs',
  globalSearch: 'Global Search',
  keyboardShortcuts: 'Keyboard Shortcuts',
  pricingAndPlans: 'Pricing & Plans',
  automationRules: 'Automations',
  shareWorkspace: 'Share & Permissions',
  userProfile: 'User Profile',
  signOut: 'Sign Out',
  signIn: 'Sign In',
  signUp: 'Sign Up',
};

const additionalVi = {
  // Missing 13 keys
  aiSubtask: 'Tạo việc phụ bằng AI',
  generateReport: 'Tạo báo cáo',
  productivityReport: 'Báo cáo năng suất',
  morningBriefing: 'Bản tin sáng',
  personalization: 'Cá nhân hóa',
  notificationSettings: 'Cài đặt thông báo',
  resetDefaults: 'Khôi phục mặc định',
  optionNamePlaceholder: 'Tên tùy chọn...',
  deleteOption: 'Xóa tùy chọn',
  moveUp: 'Di chuyển lên',
  moveDown: 'Di chuyển xuống',
  pickColor: 'Chọn màu',
  minOptionWarning: 'Phải có ít nhất 1 tùy chọn trong danh sách',

  // Settings Panel Navigation & Tabs
  settingsSubtitle: 'Trung tâm điều khiển không gian',
  searchSettings: 'Tìm kiếm cài đặt...',
  workspaceCategory: 'Không gian làm việc',
  personalCategory: 'Cá nhân',
  settingsGeneral: 'Không gian làm việc',
  settingsGeneralDesc: 'Nhận diện và thương hiệu',
  settingsPeople: 'Thành viên',
  settingsPeopleDesc: 'Thành viên và quyền truy cập',
  settingsAi: 'Apexa AI',
  settingsAiDesc: 'Cấu hình mô hình và trợ lý AI',
  settingsAuditLogs: 'Nhật ký hoạt động',
  settingsAuditLogsDesc: 'Sự kiện và lịch sử trong không gian',
  settingsDataExport: 'Dữ liệu & Lưu trữ',
  settingsDataExportDesc: 'Xuất dữ liệu và sao lưu',
  settingsPreferences: 'Giao diện',
  settingsPreferencesDesc: 'Chủ đề, ngôn ngữ và hiển thị',
  settingsNotifications: 'Thông báo',
  settingsNotificationsDesc: 'Cảnh báo và chế độ tập trung',
  settingsSecurity: 'Bảo mật',
  settingsSecurityDesc: 'Tài khoản, phiên và xác thực',

  // General & Appearance
  workspaceIdentity: 'Nhận diện không gian làm việc',
  workspaceIdentityDesc: 'Quản lý tên, hình ảnh nhận diện và các thiết lập mặc định mà đội ngũ sử dụng mỗi ngày.',
  createWorkspaceBtn: 'Tạo không gian',
  basicInformation: 'Thông tin cơ bản',
  basicInformationDesc: 'Sử dụng tên rõ ràng và hình ảnh nhận diện dễ nhớ.',
  brandColor: 'Màu thương hiệu',
  dangerZoneTitle: 'Khu vực nguy hiểm',
  dangerZoneDesc: 'Các thao tác này ảnh hưởng đến mọi người có quyền truy cập không gian.',
  deleteThisWorkspace: 'Xóa không gian này',
  deleteThisWorkspaceDesc: 'Xóa vĩnh viễn không gian và toàn bộ cấu trúc liên quan.',
  noWorkspaceSelected: 'Chưa chọn không gian làm việc',
  membersAndAccess: 'Thành viên & Quyền truy cập',
  membersAndAccessDesc: 'Mời đồng đội, tổ chức phòng ban và theo dõi cách phân bổ công việc.',
  appearanceAndTheme: 'Giao diện & Trải nghiệm',
  appearanceAndThemeDesc: 'Điều chỉnh Apexa phù hợp với môi trường và cách tập trung của bạn.',
  colorMode: 'Chế độ màu',
  colorModeDesc: 'Chọn giao diện dễ chịu nhất trong suốt ngày làm việc.',
  lightMode: 'Sáng',
  darkMode: 'Tối',
  systemMode: 'Theo hệ thống',
  systemModeDesc: 'Theo thiết bị · hiện đang {mode}',
  accentAndEffects: 'Màu nhấn & Hiệu ứng',
  accentAndEffectsDesc: 'Làm nổi bật thao tác quan trọng mà không gây rối mắt.',
  interfaceDepth: 'Độ sâu giao diện',
  depthSoft: 'Nhẹ',
  depthBalanced: 'Cân bằng',
  depthImmersive: 'Nổi bật',
  uiSounds: 'Âm thanh giao diện',
  uiSoundsDesc: 'Phát âm thanh phản hồi nhẹ cho các thao tác quan trọng.',
  languageAndRegion: 'Ngôn ngữ & Khu vực',
  languageAndRegionDesc: 'Chuyển đổi linh hoạt giữa Tiếng Việt và Tiếng Anh.',
  displayLanguage: 'Ngôn ngữ hiển thị',
  displayLanguageDesc: 'Ngôn ngữ chính hiển thị trên toàn bộ giao diện Apexa OS.',
  languageVietnamese: 'Tiếng Việt',
  languageVietnameseDesc: 'Tiếng Việt (Việt Nam)',
  languageEnglish: 'English',
  languageEnglishDesc: 'Tiếng Anh (Hoa Kỳ)',
  languageSwitchSuccess: 'Đã cập nhật ngôn ngữ thành công',
  selectLanguage: 'Chọn ngôn ngữ',
  systemOperational: 'Hệ thống hoạt động bình thường',
  systemOperationalDesc: 'Tất cả các dịch vụ đang vận hành ổn định',
  exportReady: 'Dữ liệu đã sẵn sàng',
  exportReadyDesc: 'Bản sao lưu JSON đã được tải xuống thiết bị.',
  exportDataBtn: 'Xuất dữ liệu JSON',
  exportWorkspaceData: 'Xuất dữ liệu không gian làm việc',
  exportWorkspaceDataDesc: 'Tải xuống toàn bộ công việc, tài liệu và thành viên dưới dạng tệp JSON.',

  // AI & Gemini Settings
  freeApiKeyNotice: 'Tự do kết nối khóa Gemini của bạn',
  freeApiKeyNoticeDesc: 'Khóa API được lưu an toàn cục bộ trên trình duyệt của bạn và tự động kích hoạt toàn bộ tính năng trợ lý AI, tạo việc, tóm tắt tài liệu, phân tích tiến độ và lập báo cáo.',
  getFreeApiKey: 'Nhận khóa API Gemini miễn phí tại Google AI Studio ↗',
  connectGeminiTitle: 'Kết nối Gemini API',
  connectGeminiDesc: 'Cấu hình khóa API và mô hình xử lý cho Apexa AI.',
  apiKeyLabel: 'Khóa API Gemini',
  apiKeyPlaceholder: 'Dán khóa API của bạn (AIzaSy...)',
  apiKeySavedLocally: 'Khóa API được lưu an toàn trong localStorage trên trình duyệt này.',
  aiModelLabel: 'Mô hình AI',
  temperatureLabel: 'Mức độ sáng tạo (Temperature)',
  temperaturePrecise: 'Chính xác (0.2)',
  temperatureBalanced: 'Cân bằng (0.7)',
  temperatureCreative: 'Sáng tạo (1.0)',
  searchGrounding: 'Tìm kiếm Google trực tuyến',
  searchGroundingDesc: 'Cho phép AI tra cứu dữ liệu web thời gian thực để có bối cảnh chính xác.',
  dailyBriefingToggle: 'Bản tin sáng thông minh',
  dailyBriefingToggleDesc: 'Tự động phân tích công việc quá hạn và sắp tới vào mỗi buổi sáng.',
  briefingTime: 'Giờ phát bản tin',
  testAiConnectionBtn: 'Kiểm tra kết nối',
  testingAiConnection: 'Đang kiểm tra...',
  aiConnectedSuccess: 'Kết nối Gemini AI thành công',
  aiConnectedSuccessDesc: 'Mô hình {model} đã sẵn sàng hoạt động.',

  // Notifications Fine-Tuning
  notificationDelivery: 'Phân phối thông báo',
  notificationDeliveryDesc: 'Điều khiển toàn bộ cảnh báo trên thiết bị này.',
  enableAllNotifications: 'Bật thông báo',
  enableAllNotificationsDesc: 'Nhận cập nhật hoạt động và lời nhắc.',
  enableNotificationSound: 'Âm thanh thông báo',
  enableNotificationSoundDesc: 'Phát âm thanh ngắn khi có cảnh báo.',
  onlyImportantUpdates: 'Chỉ cập nhật quan trọng',
  onlyImportantUpdatesDesc: 'Giảm nhiễu bằng cách ưu tiên việc được giao và hạn chót.',
  notificationContentTitle: 'Nội dung cần thông báo',
  notificationContentSubtitle: 'Tinh chỉnh những hoạt động có thể làm gián đoạn sự tập trung.',
  notifyAssignments: 'Việc được giao',
  notifyAssignmentsDesc: 'Khi có công việc được giao cho bạn',
  notifyDeadlines: 'Hạn chót',
  notifyDeadlinesDesc: 'Nhắc việc sắp đến hạn và quá hạn',
  notifyComments: 'Bình luận & Nhắc tên',
  notifyCommentsDesc: 'Phản hồi và lượt nhắc tên trong thảo luận',
  notifyStatusChanges: 'Thay đổi trạng thái',
  notifyStatusChangesDesc: 'Cập nhật tiến độ của công việc đang theo dõi',
  notifyFilteringTags: 'Hoạt động nhãn',
  notifyFilteringTagsDesc: 'Cập nhật cho các nhãn đang theo dõi',
  notifyChatMessages: 'Tin nhắn chat',
  notifyChatMessagesDesc: 'Thông báo khi có tin nhắn mới trong phòng chat',
  notifySystemEvents: 'Sự kiện hệ thống',
  notifySystemEventsDesc: 'Đồng bộ, bảo mật và hoạt động tài khoản',
  focusSchedule: 'Lịch tập trung',
  focusScheduleDesc: 'Tự động tắt tiếng cảnh báo thông thường trong giờ làm việc sâu.',
  quietHours: 'Khung giờ yên tĩnh',
  quietHoursDesc: 'Đặt khoảng thời gian tập trung lặp lại hằng ngày.',
  quietStart: 'Bắt đầu',
  quietEnd: 'Kết thúc',
  alertFrequency: 'Tần suất cảnh báo',
  alertFrequencyDesc: 'Gom nhóm thông báo để giảm gián đoạn.',
  freqAll: 'Mọi cập nhật',
  freqThrottled: 'Nhóm thông minh',
  freqMinimal: 'Tối thiểu',

  // Task Statuses & Details
  taskStatusTodo: 'Cần làm',
  taskStatusInProgress: 'Đang thực hiện',
  taskStatusReview: 'Chờ duyệt',
  taskStatusDone: 'Hoàn thành',
  priorityUrgent: 'Khẩn cấp',
  priorityHigh: 'Cao',
  priorityMedium: 'Trung bình',
  priorityLow: 'Thấp',
  unassigned: 'Chưa phân công',
  assigneesCount: '{count} người phụ trách',
  bulkDeleteTitle: 'Xóa công việc hàng loạt',
  bulkDeleteConfirm: 'Bạn có chắc chắn muốn xóa {count} công việc đã chọn? Tất cả các công việc này sẽ bị xóa vĩnh viễn khỏi hệ thống.',
  bulkDeleteBtn: 'Xóa {count} việc',
  duplicateTask: 'Nhân bản công việc',
  duplicatedTaskSuccess: 'Đã tạo bản sao cho "{title}"',
  copyTaskSuffix: '(Bản sao)',
  groupByStatus: 'Nhóm theo trạng thái',
  groupByPriority: 'Nhóm theo mức ưu tiên',
  groupByAssignee: 'Nhóm theo người phụ trách',
  showTaskList: 'Hiện thanh danh sách công việc',
  hideTaskList: 'Ẩn thanh danh sách công việc',
  startTimerTooltip: 'Bắt đầu bấm giờ',
  stopTimerTooltip: 'Dừng bấm giờ',
  timerLoggedSuccess: 'Đã thêm {hours} giờ vào "{title}"',
  timerStoppedNoTime: 'Không ghi nhận thời gian (dưới 1 phút)',
  freePlanLimitSpaces: 'Tài khoản Miễn phí chỉ tạo được tối đa 5 Spaces. Vui lòng nâng cấp gói Pro để không giới hạn!',
  freePlanLimitTitle: 'Giới hạn gói Free',
  spaceCreatedSuccess: 'Đã tạo space "{name}" thành công! 🎉',
  folderCreatedSuccess: 'Đã tạo thư mục "{name}"',
  documentCreatedSuccess: 'Đã tạo tài liệu "{title}"',
  whiteboardCreatedSuccess: 'Đã tạo bảng trắng "{name}"',
  listCreatedSuccess: 'Đã tạo danh sách "{name}"',
  pomodoroActiveToast: 'Đã bật Pomodoro {mode} trong {minutes} phút. Tạm dừng các thông báo phụ.',
  pomodoroPausedToast: 'Đã tạm dừng đồng hồ Pomodoro.',
  pomodoroEndedToast: 'Phiên Pomodoro kết thúc. Đã khôi phục thông báo.',

  // Landing Page Copy
  landingHeroBadge: 'Nền tảng Quản trị & Năng suất All-in-One',
  landingHeroTitle1: 'Làm việc Thông minh hơn,',
  landingHeroTitle2: 'Tối ưu Năng suất Vượt bậc.',
  landingHeroDesc: 'Không gian làm việc đồng nhất tích hợp Quản lý công việc, Tài liệu thông minh, Bảng trắng vô tận, Trò chuyện thời gian thực, Trợ lý AI và Phân tích chuyên sâu với tốc độ cực nhanh.',
  landingStartFree: 'Bắt đầu Miễn phí',
  landingExploreDemo: 'Xem Demo Trải nghiệm',
  landingNoCreditCard: 'Không cần thẻ tín dụng · Miễn phí trọn đời',
  landingFeaturesTitle: 'Bộ Giải Pháp Toàn Diện Cho Đội Ngũ Tinh Nhuệ',
  landingFeaturesSubtitle: 'Thay thế hàng chục công cụ rời rạc bằng một không gian làm việc mượt mà, đồng nhất.',
  landingPricingTitle: 'Bảng Giá Minh Bạch, Linh Hoạt',
  landingPricingSubtitle: 'Bắt đầu miễn phí và nâng cấp linh hoạt theo quy mô đội ngũ của bạn.',
  landingFaqTitle: 'Câu Hỏi Thường Gặp',
  landingFaqSubtitle: 'Mọi thắc mắc của bạn về Apexa OS đều có lời giải đáp.',
  landingTestimonialsTitle: 'Được Tin Dùng Bởi Các Đội Ngũ Xuất Sắc',
  landingTestimonialsSubtitle: 'Khám phá cách các đội ngũ kỹ thuật và thiết kế tăng tốc bàn giao dự án cùng Apexa.',
  landingFooterTagline: 'Hệ điều hành làm việc đồng nhất cho các đội ngũ hiệu suất cao.',
  landingRightsReserved: 'Bảo lưu mọi quyền.',
  categoryAll: 'Tất cả giải pháp',
  categoryTask: 'Quản lý dự án & Sprint',
  categoryAi: 'Trí tuệ nhân tạo Apexa Brain',
  categoryCollaboration: 'Cộng tác thời gian thực',
  categoryAnalytics: 'Phân tích & Tối ưu hiệu suất',

  // Time formatting helpers
  timeJustNow: 'Vừa xong',
  timeMinutesAgo: '{count} phút trước',
  timeHoursAgo: '{count} giờ trước',
  timeYesterday: 'Hôm qua',
  timeDaysAgo: '{count} ngày trước',
  timeOverdueYesterday: 'Quá hạn hôm qua',
  timeOverdueDays: 'Quá hạn {count} ngày',

  // Hubs
  financeHub: 'Tài chính & Hóa đơn',
  goalsHub: 'Mục tiêu & OKRs',
  inboxHub: 'Thông báo & Hộp thư',
  analyticsHub: 'Phân tích hiệu suất',
  crmWorkspace: 'CRM & Khách hàng',
  baseHub: 'Apexa Base (Cơ sở dữ liệu)',
  teamCommandCenter: 'Trung tâm chỉ huy đội ngũ',
  whiteboardCanvas: 'Bảng trắng trực quan',
  docsHub: 'Tài liệu cộng tác',
  globalSearch: 'Tìm kiếm toàn cục',
  keyboardShortcuts: 'Phím tắt bàn phím',
  pricingAndPlans: 'Bảng giá & Gói dịch vụ',
  automationRules: 'Tự động hóa',
  shareWorkspace: 'Chia sẻ & Phân quyền',
  userProfile: 'Hồ sơ người dùng',
  signOut: 'Đăng xuất',
  signIn: 'Đăng nhập',
  signUp: 'Đăng ký',
};

// Function to parse a .ts file into an object of key -> raw string/function
function parseLocaleFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = new Map();
  
  let currentKey = null;
  let currentVal = [];
  let inObject = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inObject) {
      if (trimmed.includes('export const en') || trimmed.includes('export const vi')) {
        inObject = true;
      }
      continue;
    }

    if (trimmed === '};' || (trimmed === '}' && i > lines.length - 5)) {
      if (currentKey) {
        entries.set(currentKey, currentVal.join('\n'));
        currentKey = null;
        currentVal = [];
      }
      break;
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    const match = line.match(/^\s*['"]?([a-zA-Z0-9_\-]+)['"]?\s*:\s*(.+)$/);
    if (match) {
      if (currentKey) {
        entries.set(currentKey, currentVal.join('\n'));
      }
      currentKey = match[1];
      currentVal = [match[2]];
    } else if (currentKey) {
      currentVal.push(line);
    }
  }

  if (currentKey) {
    entries.set(currentKey, currentVal.join('\n'));
  }

  return entries;
}

const enEntries = parseLocaleFile('./src/locales/en.ts');
const viEntries = parseLocaleFile('./src/locales/vi.ts');

console.log('Original EN entries:', enEntries.size);
console.log('Original VI entries:', viEntries.size);

// Merge additional keys
for (const [k, v] of Object.entries(additionalEn)) {
  if (!enEntries.has(k)) {
    enEntries.set(k, JSON.stringify(v) + ',');
  }
}

for (const [k, v] of Object.entries(additionalVi)) {
  if (!viEntries.has(k)) {
    viEntries.set(k, JSON.stringify(v) + ',');
  }
}

// Cross sync any remaining missing
for (const [k, v] of enEntries) {
  if (!viEntries.has(k)) {
    if (additionalVi[k]) {
      viEntries.set(k, JSON.stringify(additionalVi[k]) + ',');
    } else {
      viEntries.set(k, v);
    }
  }
}

for (const [k, v] of viEntries) {
  if (!enEntries.has(k)) {
    if (additionalEn[k]) {
      enEntries.set(k, JSON.stringify(additionalEn[k]) + ',');
    } else {
      enEntries.set(k, v);
    }
  }
}

console.log('Merged EN entries:', enEntries.size);
console.log('Merged VI entries:', viEntries.size);

// Helper to write file
function serializeLocale(entries, lang) {
  const lines = [
    lang === 'en' 
      ? "export type Translations = Record<string, string | ((...args: (string | number)[]) => string)>;"
      : "import { Translations } from './en';",
    "",
    `export const ${lang}: Translations = {`
  ];

  for (const [key, val] of entries) {
    let cleanVal = val.trim();
    if (!cleanVal.endsWith(',')) cleanVal += ',';
    const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `'${key}'`;
    lines.push(`  ${safeKey}: ${cleanVal}`);
  }

  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

fs.writeFileSync('./src/locales/en.ts', serializeLocale(enEntries, 'en'), 'utf-8');
fs.writeFileSync('./src/locales/vi.ts', serializeLocale(viEntries, 'vi'), 'utf-8');

console.log('Successfully written ./src/locales/en.ts and ./src/locales/vi.ts');
