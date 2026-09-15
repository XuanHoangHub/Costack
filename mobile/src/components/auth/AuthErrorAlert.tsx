import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldAlert, AlertTriangle, Clock, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { formatAuthError, FormattedAuthError } from '../../utils/authError';

export interface AuthErrorAlertProps {
  error: string | FormattedAuthError | null | undefined;
  isVietnamese?: boolean;
  onClose?: () => void;
}

export const AuthErrorAlert: React.FC<AuthErrorAlertProps> = ({
  error,
  isVietnamese = true,
  onClose,
}) => {
  if (!error) return null;

  const info: FormattedAuthError =
    typeof error === 'string' ? formatAuthError(error, isVietnamese) : error;

  const handleClose = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onClose) onClose();
  };

  const renderIcon = () => {
    if (info.type === 'expired') {
      return <Clock size={18} color="#f43f5e" />;
    }
    if (info.type === 'rate_limit') {
      return <AlertTriangle size={18} color="#f43f5e" />;
    }
    return <ShieldAlert size={18} color="#f43f5e" />;
  };

  return (
    <View style={styles.container}>
      {/* Top glowing accent line */}
      <View style={styles.topAccent} />

      <View style={styles.contentRow}>
        <View style={styles.iconWrap}>{renderIcon()}</View>

        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{info.title}</Text>
            {onClose && (
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
              >
                <X size={15} color="#fda4af" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.description}>{info.description}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: 'rgba(244, 63, 94, 0.6)',
    borderRadius: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fda4af',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 2,
  },
  description: {
    fontSize: 12,
    color: '#fecdd3',
    lineHeight: 17,
  },
});
