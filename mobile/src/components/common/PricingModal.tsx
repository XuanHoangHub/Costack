import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Sparkles,
  Check,
  X,
  Zap,
  Crown,
  Shield,
  Layers,
  Clock,
  ArrowRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../locales';
import { Button } from './Button';

interface PricingModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ visible, onClose }) => {
  const colors = useUiStore((s) => s.getColors());
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateCurrentUser = useAuthStore((s) => s.updateCurrentUser);
  const { t } = useTranslation();

  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const handleUpgrade = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateCurrentUser({
      isPremium: true,
      role: 'admin',
    });
    Toast.show({
      type: 'success',
      text1: 'Nâng cấp thành công! 🎉',
      text2: `Tài khoản của bạn đã được nâng cấp lên gói ${selectedPlan === 'pro' ? 'Pro' : 'Enterprise'}.`,
      visibilityTime: 3500,
    });
    onClose();
  };

  const plans = [
    {
      id: 'pro',
      name: 'Gói Chuyên Nghiệp (Pro)',
      badge: 'Phổ biến nhất',
      priceYearly: '89.000 ₫ / tháng',
      priceMonthly: '119.000 ₫ / tháng',
      description: 'Dành cho cá nhân và nhóm làm việc chuyên sâu cần tối ưu hiệu suất.',
      features: [
        'Không giới hạn công việc & Không gian',
        'Trợ lý Costack Brain AI không giới hạn truy vấn',
        'Đồng bộ dữ liệu thời gian thực Realtime',
        'Báo cáo & Phân tích chuyên sâu (Analytics)',
        'Lịch toàn diện và Đồng hồ Pomodoro',
        'Hỗ trợ ưu tiên 24/7',
      ],
      icon: Zap,
      gradient: colors.gradientPrimary,
    },
    {
      id: 'enterprise',
      name: 'Gói Doanh Nghiệp (Enterprise)',
      badge: 'Toàn diện',
      priceYearly: '199.000 ₫ / tháng',
      priceMonthly: '249.000 ₫ / tháng',
      description: 'Dành cho doanh nghiệp cần quản trị tập trung và bảo mật cao cấp.',
      features: [
        'Toàn bộ quyền lợi gói Pro',
        'Quản trị đa không gian làm việc (Multi-workspace)',
        'Phân quyền chi tiết (Owner, Admin, Member, Guest)',
        'Sổ quỹ tài chính & Báo cáo dòng tiền nâng cao',
        'Tùy biến thương hiệu và Accent color độc quyền',
        'Dedicated SLA & Bảo mật cấp độ cao',
      ],
      icon: Crown,
      gradient: ['#7c3aed', '#ec4899'] as const,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.crownBox}>
                <Crown size={18} color="#ffffff" />
              </LinearGradient>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t.pricing.title}</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>{t.pricing.subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Billing Cycle Switch */}
            <View style={[styles.cycleBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setBillingCycle('monthly')}
                style={[
                  styles.cycleBtn,
                  billingCycle === 'monthly' && { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.cycleText,
                    { color: billingCycle === 'monthly' ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  Theo tháng
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setBillingCycle('yearly')}
                style={[
                  styles.cycleBtn,
                  billingCycle === 'yearly' && { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.cycleText,
                    { color: billingCycle === 'yearly' ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  Theo năm (-25%)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Plans List */}
            {plans.map((p) => {
              const isSelected = selectedPlan === p.id;
              const Icon = p.icon;
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedPlan(p.id as any)}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planTitleRow}>
                      <View style={[styles.planIcon, { backgroundColor: `${colors.primary}20` }]}>
                        <Icon size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[styles.planName, { color: colors.textPrimary }]}>{p.name}</Text>
                        <Text style={[styles.planPrice, { color: colors.primary }]}>
                          {billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: isSelected ? colors.primary : colors.border }]}>
                      <Text style={[styles.badgePillText, { color: '#ffffff' }]}>{p.badge}</Text>
                    </View>
                  </View>

                  <Text style={[styles.planDesc, { color: colors.textSecondary }]}>{p.description}</Text>

                  <View style={styles.featuresList}>
                    {p.features.map((feat, idx) => (
                      <View key={idx} style={styles.featRow}>
                        <Check size={14} color={colors.success} style={{ marginRight: 8 }} />
                        <Text style={[styles.featText, { color: colors.textPrimary }]}>{feat}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}

            <Button
              title={`${t.pricing.upgradeNow} • ${selectedPlan === 'pro' ? 'Pro' : 'Enterprise'}`}
              onPress={handleUpgrade}
              style={{ marginTop: 8, marginBottom: 24 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  crownBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cycleBox: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cycleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  planDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  featuresList: {
    gap: 6,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featText: {
    fontSize: 12,
  },
});
