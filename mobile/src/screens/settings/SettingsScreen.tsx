import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  User,
  Moon,
  Globe,
  FileText,
  Wallet,
  Users,
  Sparkles,
  Layers,
  ChevronRight,
  LogOut,
  Shield,
  Briefcase,
  BarChart2,
  Calendar,
  Timer,
  Crown,
  Palette,
  Check,
  Zap,
  Download,
  PenTool,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { WorkspaceSwitcherModal } from '../../components/common/WorkspaceSwitcherModal';
import { PricingModal } from '../../components/common/PricingModal';
import { ExportDataModal } from '../../components/common/ExportDataModal';
import { AutomationRulesModal } from '../../components/common/AutomationRulesModal';
import { AccentPreset } from '../../theme/colors';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const accentPreset = useUiStore((s) => s.accentPreset);
  const setAccentPreset = useUiStore((s) => s.setAccentPreset);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAutomationsModal, setShowAutomationsModal] = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const signOut = useAuthStore((s) => s.signOut);
  const { t } = useTranslation();

  const presets: { id: AccentPreset; name: string; color: string }[] = [
    { id: 'indigo', name: 'Indigo', color: '#3b82f6' },
    { id: 'ocean', name: 'Đại dương', color: '#0284c7' },
    { id: 'forest', name: 'Ngọc lục', color: '#10b981' },
    { id: 'sunset', name: 'Hoàng hôn', color: '#f43f5e' },
  ];

  const handleSelectAccent = (id: AccentPreset) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setAccentPreset(id);
  };

  const handleToggleTheme = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleDarkMode();
  };

  const handleToggleLanguage = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

  const handleSignOut = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    await signOut();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t.settings.title} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Profile')}
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Avatar
            name={currentUser?.name || 'User'}
            url={currentUser?.avatar}
            size={54}
            online={true}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {currentUser?.name || 'Thành viên'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
              {currentUser?.email || 'user@costack.app'}
            </Text>
            <Text style={[styles.profileStatus, { color: colors.primary }]}>
              {currentUser?.statusMessage || 'Đang hoạt động'}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Modules Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t.settings.modules}
        </Text>

        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => setShowWorkspaceModal(true)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Briefcase size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                  Không gian làm việc (Workspaces)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  {activeWorkspace?.name || 'Costack'} • {workspaces.length} không gian
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Analytics')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <BarChart2 size={18} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Báo cáo & Phân tích (Analytics)
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Calendar')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.info}20` }]}>
                <Calendar size={18} color={colors.info} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Lịch làm việc (Calendar)
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Timer')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.inprogress}20` }]}>
                <Timer size={18} color={colors.inprogress} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Đồng hồ Pomodoro
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Docs')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <FileText size={18} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t.settings.docsHub}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Whiteboard')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.accentCyan}20` }]}>
                <PenTool size={18} color={colors.accentCyan} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Bảng vẽ & Ý tưởng (Whiteboard)
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Finance')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.success}20` }]}>
                <Wallet size={18} color={colors.success} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t.settings.financeHub}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Spaces')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.info}20` }]}>
                <Layers size={18} color={colors.info} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t.settings.workspace}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('AiBrain')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Sparkles size={18} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t.settings.aiAssistant}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => navigation.navigate('Team')}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Users size={18} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t.settings.teamDirectory}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => setShowPricingModal(true)}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.warning}25` }]}>
                <Crown size={18} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary, fontWeight: '700' }]}>
                  Gói dịch vụ & Nâng cấp VIP
                </Text>
                <Text style={{ fontSize: 11, color: colors.warning, marginTop: 1 }}>
                  Mở khóa tính năng Không giới hạn
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t.settings.theme}
        </Text>

        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Dark Mode Switch */}
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceHover }]}>
                <Moon size={18} color={colors.textPrimary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t.settings.darkMode}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleTheme}
              trackColor={{ false: '#64748b', true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Language Switch */}
          <TouchableOpacity
            onPress={handleToggleLanguage}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceHover }]}>
                <Globe size={18} color={colors.textPrimary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t.settings.language}
              </Text>
            </View>
            <Text style={[styles.langBadge, { color: colors.primary }]}>
              {language === 'vi' ? 'Tiếng Việt' : 'English'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Accent Color Presets */}
          <View style={styles.accentSection}>
            <View style={[styles.menuLeft, { marginBottom: 12 }]}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Palette size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                  Màu chủ đạo (Accent Color)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  Tùy chỉnh tông màu nhận diện thương hiệu
                </Text>
              </View>
            </View>
            <View style={styles.accentGrid}>
              {presets.map((p) => {
                const isSelected = accentPreset === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectAccent(p.id)}
                    style={[
                      styles.accentChip,
                      {
                        backgroundColor: colors.surfaceHover,
                        borderColor: isSelected ? p.color : colors.border,
                      },
                      isSelected && { backgroundColor: `${p.color}15` },
                    ]}
                  >
                    <View style={[styles.accentDot, { backgroundColor: p.color }]}>
                      {isSelected && <Check size={10} color="#ffffff" strokeWidth={3} />}
                    </View>
                    <Text
                      style={[
                        styles.accentName,
                        { color: isSelected ? p.color : colors.textSecondary },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Data & Automations Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Dữ liệu & Tự động hóa
        </Text>

        <View
          style={[
            styles.menuGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowAutomationsModal(true);
            }}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.primary}20` }]}>
                <Zap size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                  Quy tắc tự động hóa (Automations)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  Tự động ghi nhật ký, gửi thông báo khi hoàn thành task
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowExportModal(true);
            }}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: `${colors.inprogress}20` }]}>
                <Download size={18} color={colors.inprogress} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                  Xuất dữ liệu dự án (Export Data)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  Xuất định dạng CSV / Excel hoặc JSON sao lưu
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.dangerSubtle,
              borderColor: `${colors.danger}40`,
            },
          ]}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            {t.settings.logout}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Costack Mobile • Version 1.0.0
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      <WorkspaceSwitcherModal
        visible={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
      />

      <PricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />

      <ExportDataModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <AutomationRulesModal
        visible={showAutomationsModal}
        onClose={() => setShowAutomationsModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    marginBottom: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  profileStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  menuGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  langBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
  accentSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  accentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  accentDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentName: {
    fontSize: 12,
    fontWeight: '600',
  },
});
