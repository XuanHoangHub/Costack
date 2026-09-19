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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar
            name={name || 'User'}
            url={currentUser?.avatar}
            size={80}
            online={true}
          />
          <Text style={[styles.emailText, { color: colors.textMuted }]}>
            {currentUser?.email}
          </Text>
        </View>

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

        <Button
          title={t.common.save}
          onPress={handleSave}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  emailText: {
    fontSize: 13,
    marginTop: 10,
  },
});
