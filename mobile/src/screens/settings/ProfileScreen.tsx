import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import Toast from 'react-native-toast-message';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateCurrentUser = useAuthStore((s) => s.updateCurrentUser);
  const { t } = useTranslation();

  const [name, setName] = useState(currentUser?.name || '');
  const [statusMessage, setStatusMessage] = useState(currentUser?.statusMessage || '');
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  const handleSave = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    updateCurrentUser({
      name: name.trim(),
      statusMessage: statusMessage.trim(),
      department: department.trim(),
      phone: phone.trim(),
    });
    Toast.show({
      type: 'success',
      text1: 'Thành công',
      text2: 'Hồ sơ cá nhân đã được cập nhật thành công.',
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.settings.profile}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Avatar
              name={name || 'User'}
              url={currentUser?.avatar}
              size={84}
              online={true}
            />
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {name || 'Thành viên'}
          </Text>
          <Text style={[styles.emailText, { color: colors.textMuted }]}>
            {currentUser?.email}
          </Text>
        </View>

        <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input
            label="Họ và tên"
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên của bạn..."
          />

          <Input
            label="Trạng thái cá nhân"
            value={statusMessage}
            onChangeText={setStatusMessage}
            placeholder="Ví dụ: Đang bận làm việc 🚀"
          />

          <Input
            label="Phòng ban / Vị trí"
            value={department}
            onChangeText={setDepartment}
            placeholder="Ví dụ: Kỹ thuật, Marketing..."
          />

          <Input
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            placeholder="0912..."
            keyboardType="phone-pad"
          />
        </View>

        <Button
          title={t.common.save}
          onPress={handleSave}
          style={{ marginTop: 20 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  emailText: {
    fontSize: 13,
    marginTop: 3,
  },
  cardSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
});
