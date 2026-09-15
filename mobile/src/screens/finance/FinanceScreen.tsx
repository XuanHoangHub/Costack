import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useFinanceStore } from '../../store/financeStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';

interface FinanceScreenProps {
  navigation: any;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const getTotalBalance = useFinanceStore((s) => s.getTotalBalance);
  const getTotalIncome = useFinanceStore((s) => s.getTotalIncome);
  const getTotalExpense = useFinanceStore((s) => s.getTotalExpense);
  const { t } = useTranslation();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [selectedCat, setSelectedCat] = useState('Dự án Khách hàng');

  const totalBalance = getTotalBalance();
  const totalIncome = getTotalIncome();
  const totalExpense = getTotalExpense();

  const handleAdd = () => {
    const num = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (!title.trim() || isNaN(num) || num <= 0) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    addTransaction({
      title: title.trim(),
      amount: num,
      currency: 'VND',
      type,
      category: selectedCat,
      status: 'completed',
    });

    setTitle('');
    setAmount('');
    setShowModal(false);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.finance.title}
        subtitle="Quản lý thu chi & sổ quỹ dự án"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {accounts.length > 0 && (
          <View style={[styles.accountHint, { backgroundColor: colors.primarySubtle, borderColor: `${colors.primary}35` }]}>
            <Text style={[styles.accountHintText, { color: colors.primaryText }]}>Ghi vào {accounts[0].bank} ••••{accounts[0].accountNumber.slice(-4)}</Text>
          </View>
        )}
        {/* Total Balance Card */}
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
              {t.finance.totalBalance}
            </Text>
            <Wallet size={20} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.balanceValue,
              { color: totalBalance >= 0 ? colors.textPrimary : colors.danger },
            ]}
          >
            {formatCurrency(totalBalance)}
          </Text>

          {/* Income & Expense Row */}
          <View style={styles.incomeExpenseRow}>
            <View style={styles.statBox}>
              <View style={[styles.iconPill, { backgroundColor: colors.successSubtle }]}>
                <ArrowDownLeft size={16} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>
                  {t.finance.income}
                </Text>
                <Text style={[styles.incomeText, { color: colors.success }]}>
                  +{formatCurrency(totalIncome)}
                </Text>
              </View>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.iconPill, { backgroundColor: colors.dangerSubtle }]}>
                <ArrowUpRight size={16} color={colors.danger} />
              </View>
              <View>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>
                  {t.finance.expense}
                </Text>
                <Text style={[styles.expenseText, { color: colors.danger }]}>
                  -{formatCurrency(totalExpense)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t.finance.recentTransactions}
        </Text>

        {accounts.length === 0 && (
          <View style={[styles.setupHint, { backgroundColor: colors.warningSubtle, borderColor: `${colors.warning}40` }]}>
            <Text style={[styles.setupHintTitle, { color: colors.warning }]}>Cần một tài khoản tài chính</Text>
            <Text style={[styles.setupHintText, { color: colors.textSecondary }]}>Tạo tài khoản trong Finance Hub trên web để ghi thu chi chính xác và đồng bộ số dư.</Text>
          </View>
        )}

        {transactions.map((tx) => (
          <View
            key={tx.id}
            style={[
              styles.txItem,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.txIconBox,
                {
                  backgroundColor:
                    tx.type === 'income' ? colors.successSubtle : colors.dangerSubtle,
                },
              ]}
            >
              {tx.type === 'income' ? (
                <ArrowDownLeft size={18} color={colors.success} />
              ) : (
                <ArrowUpRight size={18} color={colors.danger} />
              )}
            </View>

            <View style={styles.txDetails}>
              <Text style={[styles.txTitle, { color: colors.textPrimary }]}>
                {tx.title}
              </Text>
              <Text style={[styles.txCat, { color: colors.textMuted }]}>
                {tx.category} •{' '}
                {new Date(tx.date).toLocaleDateString('vi-VN', {
                  month: 'numeric',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <Text
              style={[
                styles.txAmount,
                { color: tx.type === 'income' ? colors.success : colors.danger },
              ]}
            >
              {tx.type === 'income' ? '+' : '-'}
              {formatCurrency(tx.amount)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t.finance.addTransaction}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Income vs Expense Toggle */}
            <View style={styles.typeRow}>
              <TouchableOpacity
                onPress={() => setType('income')}
                style={[
                  styles.typeBtn,
                  type === 'income' && { backgroundColor: colors.successSubtle, borderColor: colors.success },
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: type === 'income' ? colors.success : colors.textMuted },
                  ]}
                >
                  {t.finance.typeIncome}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setType('expense')}
                style={[
                  styles.typeBtn,
                  type === 'expense' && { backgroundColor: colors.dangerSubtle, borderColor: colors.danger },
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: type === 'expense' ? colors.danger : colors.textMuted },
                  ]}
                >
                  {t.finance.typeExpense}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <TextInput
              placeholder={t.finance.titlePlaceholder}
              placeholderTextColor={colors.textPlaceholder}
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            {/* Amount Input */}
            <TextInput
              placeholder="Số tiền (VND)..."
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            <Button
              title={t.finance.addTransaction}
              onPress={handleAdd}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  balanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  accountHint: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  accountHintText: { fontSize: 12, fontWeight: '700' },
  setupHint: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  setupHintTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  setupHintText: { fontSize: 12, lineHeight: 17 },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 12,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLabel: {
    fontSize: 11,
  },
  incomeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  expenseText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  txCat: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
});
