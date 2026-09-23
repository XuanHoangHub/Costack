import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  Database,
  Layers,
  Wallet,
  FileText,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useFinanceStore } from '../../store/financeStore';
import { useDocStore } from '../../store/docStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Button } from './Button';

interface ExportDataModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const tasks = useTaskStore((s) => s.tasks);
  const transactions = useFinanceStore((s) => s.transactions);
  const docs = useDocStore((s) => s.docs);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const wsName = activeWs?.name || 'Workspace';

  const [exportScope, setExportScope] = useState<'all' | 'tasks' | 'finance'>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      const timestamp = new Date().toISOString().slice(0, 10);
      let content = '';
      let filename = '';

      if (exportFormat === 'json') {
        filename = `costack_${wsName.replace(/\s+/g, '_')}_${timestamp}.json`;
        const exportObj: any = {
          exportedAt: new Date().toISOString(),
          workspace: { id: activeWorkspaceId, name: wsName },
        };
        if (exportScope === 'all' || exportScope === 'tasks') {
          exportObj.tasks = tasks;
        }
        if (exportScope === 'all' || exportScope === 'finance') {
          exportObj.finance = transactions;
        }
        if (exportScope === 'all') {
          exportObj.docs = docs;
        }
        content = JSON.stringify(exportObj, null, 2);
      } else {
        // CSV with UTF-8 BOM for Excel support
        filename = `costack_${exportScope}_${timestamp}.csv`;
        const BOM = '\uFEFF';

        if (exportScope === 'tasks' || exportScope === 'all') {
          const headers = ['ID', 'Tiêu đề', 'Mô tả', 'Mức độ', 'Trạng thái', 'Hạn chót', 'Tiến độ', 'Ước tính (giờ)'];
          const rows = tasks.map((t) => [
            `"${t.id}"`,
            `"${(t.title || '').replace(/"/g, '""')}"`,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            `"${t.priority}"`,
            `"${t.status}"`,
            `"${t.dueDate || ''}"`,
            `"${t.progress || 0}%"`,
            `"${t.hoursEstimate || 0}"`,
          ]);
          content = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        } else if (exportScope === 'finance') {
          const headers = ['ID', 'Tiêu đề', 'Loại', 'Số tiền', 'Loại tiền', 'Danh mục', 'Ngày'];
          const rows = transactions.map((tr) => [
            `"${tr.id}"`,
            `"${(tr.title || '').replace(/"/g, '""')}"`,
            `"${tr.type}"`,
            `"${tr.amount}"`,
            `"${tr.currency}"`,
            `"${tr.category}"`,
            `"${tr.date}"`,
          ]);
          content = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        }
      }

      await Share.share({
        title: filename,
        message: content,
      });

      Toast.show({
        type: 'success',
        text1: 'Xuất dữ liệu thành công',
        text2: `Đã chuẩn bị tệp ${filename}`,
      });

      onClose();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Xuất dữ liệu thất bại',
        text2: e?.message || 'Có lỗi xảy ra, vui lòng thử lại.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Xuất dữ liệu dự án</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {wsName} • Tạo bản sao lưu hoặc báo cáo
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Scope Selection */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              1. Chọn phạm vi dữ liệu
            </Text>
            <View style={styles.optionGroup}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExportScope('all')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: exportScope === 'all' ? colors.primarySubtle : colors.surfaceSubtle,
                    borderColor: exportScope === 'all' ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.optionIconBox, { backgroundColor: `${colors.primary}20` }]}>
                  <Database size={18} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionName, { color: colors.textPrimary }]}>
                    Toàn bộ dữ liệu
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                    Bao gồm {tasks.length} công việc, {transactions.length} giao dịch và {docs.length} tài liệu
                  </Text>
                </View>
                {exportScope === 'all' && <CheckCircle2 size={18} color={colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExportScope('tasks')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: exportScope === 'tasks' ? colors.primarySubtle : colors.surfaceSubtle,
                    borderColor: exportScope === 'tasks' ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.optionIconBox, { backgroundColor: `${colors.inprogress}20` }]}>
                  <Layers size={18} color={colors.inprogress} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionName, { color: colors.textPrimary }]}>
                    Chỉ danh sách công việc
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                    Xuất {tasks.length} công việc kèm trạng thái, độ ưu tiên và tiến độ
                  </Text>
                </View>
                {exportScope === 'tasks' && <CheckCircle2 size={18} color={colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExportScope('finance')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: exportScope === 'finance' ? colors.primarySubtle : colors.surfaceSubtle,
                    borderColor: exportScope === 'finance' ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.optionIconBox, { backgroundColor: `${colors.success}20` }]}>
                  <Wallet size={18} color={colors.success} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionName, { color: colors.textPrimary }]}>
                    Thu chi tài chính
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                    Xuất {transactions.length} dòng dữ liệu thu chi tiền mặt
                  </Text>
                </View>
                {exportScope === 'finance' && <CheckCircle2 size={18} color={colors.primary} />}
              </TouchableOpacity>
            </View>

            {/* Format Selection */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 18 }]}>
              2. Chọn định dạng tệp
            </Text>
            <View style={styles.formatRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExportFormat('csv')}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: exportFormat === 'csv' ? colors.primarySubtle : colors.surfaceSubtle,
                    borderColor: exportFormat === 'csv' ? colors.primary : colors.border,
                  },
                ]}
              >
                <FileSpreadsheet size={24} color={exportFormat === 'csv' ? colors.primary : colors.textMuted} />
                <Text style={[styles.formatTitle, { color: colors.textPrimary }]}>CSV / Excel</Text>
                <Text style={[styles.formatSubtitle, { color: colors.textMuted }]}>
                  Dễ mở bằng Excel & Google Sheets
                </Text>
                {exportFormat === 'csv' && (
                  <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
                    <CheckCircle2 size={12} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExportFormat('json')}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: exportFormat === 'json' ? colors.primarySubtle : colors.surfaceSubtle,
                    borderColor: exportFormat === 'json' ? colors.primary : colors.border,
                  },
                ]}
              >
                <FileJson size={24} color={exportFormat === 'json' ? colors.primary : colors.textMuted} />
                <Text style={[styles.formatTitle, { color: colors.textPrimary }]}>JSON</Text>
                <Text style={[styles.formatSubtitle, { color: colors.textMuted }]}>
                  Sao lưu đầy đủ cấu trúc kỹ thuật
                </Text>
                {exportFormat === 'json' && (
                  <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
                    <CheckCircle2 size={12} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Action Button */}
            <Button
              title={isExporting ? 'Đang xuất...' : 'Xuất và Chia sẻ tệp'}
              icon={<Download size={18} color="#ffffff" />}
              onPress={handleExport}
              loading={isExporting}
              style={{ marginTop: 24 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionGroup: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    gap: 6,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  formatSubtitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  formatBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
