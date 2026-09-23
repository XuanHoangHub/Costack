import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  X,
  Landmark,
  CreditCard,
  Trash2,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useFinanceStore } from '../../store/financeStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { PressableScale } from '../../components/common/PressableScale';

interface FinanceScreenProps {
  navigation: any;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const addAccount = useFinanceStore((s) => s.addAccount);
  const getTotalBalance = useFinanceStore((s) => s.getTotalBalance);
  const getTotalIncome = useFinanceStore((s) => s.getTotalIncome);
  const getTotalExpense = useFinanceStore((s) => s.getTotalExpense);
  const { t } = useTranslation();

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Filter state
  const [filterTab, setFilterTab] = useState<'all' | 'income' | 'expense'>('all');

  // New Transaction form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [selectedCat, setSelectedCat] = useState('Dự án Khách hàng');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // New Account form
  const [bankName, setBankName] = useState('');
  const [accountNum, setAccountNum] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [accountColor, setAccountColor] = useState('#3b82f6');

  const totalBalance = getTotalBalance();
  const totalIncome = getTotalIncome();
  const totalExpense = getTotalExpense();

  const colorPresets = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const handleAdd = async () => {
    const num = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (!title.trim() || isNaN(num) || num <= 0) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    try {
      await addTransaction({
        title: title.trim(),
        amount: num,
        currency: 'VND',
        type,
        category: selectedCat,
        status: 'completed',
        accountId: selectedAccountId || accounts[0]?.id,
      });

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: `Đã ghi nhận giao dịch ${type === 'income' ? 'thu' : 'chi'} ${formatCurrency(num)}.`,
      });

      setTitle('');
      setAmount('');
      setShowModal(false);
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: e?.message || 'Không thể lưu giao dịch.',
      });
    }
  };

  const handleCreateAccount = async () => {
    if (!bankName.trim() || !accountNum.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên ngân hàng và số tài khoản.');
      return;
    }
    const balanceNum = parseFloat(initialBalance.replace(/[^0-9]/g, '')) || 0;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    try {
      await addAccount({
        bank: bankName.trim(),
        accountNumber: accountNum.trim(),
        balance: balanceNum,
        color: accountColor,
        type: 'bank',
      });

      Toast.show({
        type: 'success',
        text1: 'Đã tạo tài khoản',
        text2: `Tài khoản ${bankName.trim()} đã được thêm vào sổ quỹ.`,
      });

      setBankName('');
      setAccountNum('');
      setInitialBalance('');
      setShowAccountModal(false);
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: e?.message || 'Không thể tạo tài khoản mới.',
      });
    }
  };

  const handleDeleteTx = (txId: string, txTitle: string) => {
    Alert.alert(
      'Xóa giao dịch',
      `Bạn có chắc chắn muốn xóa giao dịch "${txTitle}"? Số dư tài khoản sẽ tự động đồng bộ lại.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            await deleteTransaction(txId);
            Toast.show({
              type: 'info',
              text1: 'Đã xóa',
              text2: 'Giao dịch đã được xóa thành công.',
            });
          },
        },
      ]
    );
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' ₫';
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterTab === 'income') return tx.type === 'income';
    if (filterTab === 'expense') return tx.type === 'expense';
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.finance.title}
        subtitle="Quản lý thu chi & sổ quỹ dự án"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowModal(true);
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Bank Accounts Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Tài khoản & Thẻ ({accounts.length})
          </Text>
          <TouchableOpacity
            onPress={() => setShowAccountModal(true)}
            style={styles.addAccountLink}
          >
            <Plus size={14} color={colors.primary} />
            <Text style={[styles.addAccountLinkText, { color: colors.primary }]}>
              Thêm tài khoản
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountsScroll}
        >
          {accounts.map((acc) => (
            <View
              key={acc.id}
              style={[
                styles.accountCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.accountTop}>
                <View
                  style={[
                    styles.accountIconWrap,
                    { backgroundColor: `${acc.color || colors.primary}20` },
                  ]}
                >
                  <Landmark size={18} color={acc.color || colors.primary} />
                </View>
                <Text style={[styles.accountTypeBadge, { color: colors.textMuted }]}>
                  ••••{acc.accountNumber.slice(-4)}
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.accountBankName, { color: colors.textPrimary }]}>
                {acc.bank}
              </Text>
              <Text style={[styles.accountBalance, { color: colors.primaryLight }]}>
                {formatCurrency(acc.balance)}
              </Text>
            </View>
          ))}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowAccountModal(true)}
            style={[
              styles.addAccountCard,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <Plus size={20} color={colors.textMuted} />
            <Text style={[styles.addAccountText, { color: colors.textMuted }]}>
              Thêm tài khoản
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Transactions Section Header & Tabs */}
        <View style={styles.txHeaderWrap}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
            {t.finance.recentTransactions}
          </Text>

          {/* Filter Tabs: Tất cả, Thu, Chi */}
          <View style={[styles.filterTabsWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setFilterTab('all')}
              style={[
                styles.filterTabBtn,
                filterTab === 'all' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterTab === 'all' ? '#ffffff' : colors.textSecondary },
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterTab('income')}
              style={[
                styles.filterTabBtn,
                filterTab === 'income' && { backgroundColor: colors.success },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterTab === 'income' ? '#ffffff' : colors.textSecondary },
                ]}
              >
                Thu
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterTab('expense')}
              style={[
                styles.filterTabBtn,
                filterTab === 'expense' && { backgroundColor: colors.danger },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterTab === 'expense' ? '#ffffff' : colors.textSecondary },
                ]}
              >
                Chi
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredTransactions.length === 0 ? (
          <View
            style={[
              styles.emptyWrap,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <CreditCard size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Chưa có giao dịch nào
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Nhấn nút "+" phía trên để ghi nhận khoản thu hoặc chi đầu tiên.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => (
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

              <TouchableOpacity
                onPress={() => handleDeleteTx(tx.id, tx.title)}
                style={styles.txDeleteBtn}
              >
                <Trash2 size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
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

            {/* Account Selector if multiple accounts */}
            {accounts.length > 1 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Tài khoản ghi nhận:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {accounts.map((acc) => {
                    const isSelected = (selectedAccountId || accounts[0]?.id) === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={[
                          styles.accountChip,
                          {
                            backgroundColor: isSelected ? `${colors.primary}25` : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.accountChipText, { color: isSelected ? colors.primaryLight : colors.textSecondary }]}>
                          {acc.bank} (••••{acc.accountNumber.slice(-4)})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Category Selector Chips */}
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Danh mục:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {categories.map((cat) => {
                  const isSelected = selectedCat === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCat(cat.name)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: isSelected ? `${cat.color}25` : colors.surfaceSubtle,
                          borderColor: isSelected ? cat.color : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.catChipText, { color: isSelected ? cat.color : colors.textSecondary }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      </Modal>

      {/* Add Bank Account Modal */}
      <Modal visible={showAccountModal} animationType="slide" transparent>
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
                Thêm tài khoản ngân hàng / ví
              </Text>
              <TouchableOpacity onPress={() => setShowAccountModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Tên ngân hàng / Ví (VD: VPBank, Techcombank, Tiền mặt)..."
              placeholderTextColor={colors.textPlaceholder}
              value={bankName}
              onChangeText={setBankName}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              placeholder="Số tài khoản (VD: 88889999)..."
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numeric"
              value={accountNum}
              onChangeText={setAccountNum}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              placeholder="Số dư ban đầu (VND, mặc định 0)..."
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numeric"
              value={initialBalance}
              onChangeText={setInitialBalance}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
            />

            {/* Color Presets */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Màu sắc nhận diện:
              </Text>
              <View style={styles.colorRow}>
                {colorPresets.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setAccountColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      accountColor === c && styles.colorDotActive,
                    ]}
                  >
                    {accountColor === c && <Check size={12} color="#ffffff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Lưu tài khoản"
              onPress={handleCreateAccount}
              style={{ marginTop: 6 }}
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
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
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
    fontSize: 30,
    fontWeight: '800',
    marginVertical: 12,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
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
    fontVariant: ['tabular-nums'],
  },
  expenseText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addAccountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addAccountLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountsScroll: {
    gap: 10,
    paddingBottom: 16,
  },
  accountCard: {
    width: 150,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
    height: 105,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTypeBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
  accountBankName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  accountBalance: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  addAccountCard: {
    width: 110,
    height: 105,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addAccountText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  txHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 6,
  },
  filterTabsWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  filterTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    fontVariant: ['tabular-nums'],
  },
  txDeleteBtn: {
    padding: 6,
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
  inputLabel: {
    fontSize: 12,
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
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
