import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FinanceTransaction, FinanceCategory, FinanceAccount } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';
import { useWorkspaceStore } from './workspaceStore';

interface FinanceState {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  fetchTransactionsFromSupabase: (workspaceId?: string) => Promise<void>;
  addTransaction: (t: Omit<FinanceTransaction, 'id' | 'date'>) => Promise<void>;
  subscribeToFinance: (workspaceId?: string) => () => void;
  getTotalBalance: () => number;
  getTotalIncome: () => number;
  getTotalExpense: () => number;
}

const defaultCategories: FinanceCategory[] = [
  { id: 'c-1', name: 'Lương & Thưởng', icon: 'wallet', color: '#10b981', type: 'income' },
  { id: 'c-2', name: 'Dự án Khách hàng', icon: 'briefcase', color: '#3b82f6', type: 'income' },
  { id: 'c-3', name: 'Hạ tầng & Cloud', icon: 'server', color: '#f59e0b', type: 'expense' },
  { id: 'c-4', name: 'Thiết bị & Văn phòng', icon: 'monitor', color: '#ef4444', type: 'expense' },
  { id: 'c-5', name: 'Marketing & Ads', icon: 'megaphone', color: '#8b5cf6', type: 'expense' },
];

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: defaultCategories,
      accounts: [],

      fetchTransactionsFromSupabase: async (workspaceId?: string) => {
        try {
          const activeWorkspaceId = workspaceId || useWorkspaceStore.getState().activeWorkspaceId;
          let query = supabase
            .from('finance_transactions')
            .select('*')
            .order('transaction_date', { ascending: false })
            .limit(50);

          if (activeWorkspaceId) {
            query = query.eq('workspace_id', activeWorkspaceId);
          }

          const [transactionsResult, accountsResult, categoriesResult] = await Promise.all([
            query,
            activeWorkspaceId
              ? supabase.from('finance_accounts').select('id,bank,account_number,balance,color').eq('workspace_id', activeWorkspaceId).order('created_at')
              : Promise.resolve({ data: [], error: null }),
            activeWorkspaceId
              ? supabase.from('finance_categories').select('id,name,icon,color,type').eq('workspace_id', activeWorkspaceId).order('sort_order')
              : Promise.resolve({ data: [], error: null }),
          ]);
          const { data, error } = transactionsResult;
          if (error) throw error;
          if (data) {
            const mapped: FinanceTransaction[] = data.map((row: any) => ({
              id: row.id,
              title: row.note || row.code || 'Giao dịch',
              amount: Number(row.amount) || 0,
              currency: 'VND',
              type: row.transaction_type === 'income' ? 'income' : 'expense',
              category: row.category || 'Khác',
              date: row.transaction_date || row.created_at || new Date().toISOString(),
              status: row.status === 'pending' ? 'pending' : 'completed',
              workspaceId: row.workspace_id,
              description: row.note,
            }));
            set({
              transactions: mapped,
              accounts: (accountsResult.data || []).map((account: any) => ({
                id: account.id, bank: account.bank, accountNumber: account.account_number,
                balance: Number(account.balance) || 0, color: account.color,
              })),
              categories: (categoriesResult.data || []).length
                ? (categoriesResult.data || []).map((category: any) => ({
                    id: category.id, name: category.name, icon: category.icon || 'tag', color: category.color || '#6366f1',
                    type: category.type === 'income' ? 'income' : category.type === 'expense' ? 'expense' : 'expense',
                  }))
                : defaultCategories,
            });
          }
        } catch (err) {
          console.warn('Failed to fetch finance transactions from Supabase:', err);
        }
      },

      addTransaction: async (t) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const workspaceId = t.workspaceId || useWorkspaceStore.getState().activeWorkspaceId;
          const account = get().accounts[0];
          if (!session?.user || !workspaceId || !account) {
            throw new Error('Hãy tạo hoặc chọn một tài khoản tài chính trên Web trước khi ghi giao dịch.');
          }
          const { error } = await supabase.rpc('record_finance_transaction', {
            p_workspace_id: workspaceId,
            p_account_id: account.id,
            p_code: `MB-${Date.now().toString().slice(-9)}`,
            p_transaction_type: t.type,
            p_category: t.category,
            p_amount: t.amount,
            p_transaction_date: new Date().toISOString().slice(0, 10),
            p_partner: '',
            p_receiver_or_payer: '',
            p_address: '',
            p_debit_account: t.type === 'income' ? '1121 - Tiền gửi ngân hàng' : '642 - Chi phí',
            p_credit_account: t.type === 'income' ? '511 - Doanh thu' : '1121 - Tiền gửi ngân hàng',
            p_note: t.title,
          });
          if (error) throw error;
          await get().fetchTransactionsFromSupabase(workspaceId);
        } catch (e) {
          console.warn('Error saving transaction to Supabase:', e);
        }
      },

      subscribeToFinance: (workspaceId?: string) => {
        const activeWorkspaceId = workspaceId || useWorkspaceStore.getState().activeWorkspaceId;
        const channelTopic = activeWorkspaceId ? `mobile-finance-sync:${activeWorkspaceId}` : 'mobile-finance-sync';
        const channel = getCleanChannel(channelTopic)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'finance_transactions' },
            () => {
              const currentWs = useWorkspaceStore.getState().activeWorkspaceId;
              get().fetchTransactionsFromSupabase(currentWs);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'finance_accounts' },
            () => {
              const currentWs = useWorkspaceStore.getState().activeWorkspaceId;
              get().fetchTransactionsFromSupabase(currentWs);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'finance_categories' },
            () => {
              const currentWs = useWorkspaceStore.getState().activeWorkspaceId;
              get().fetchTransactionsFromSupabase(currentWs);
            }
          )
          .subscribe((status) => {
            if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !supabase.realtime.isConnected()) {
              supabase.realtime.connect();
            }
          });

        return () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        };
      },

      getTotalBalance: () => {
        const income = get().getTotalIncome();
        const expense = get().getTotalExpense();
        return income - expense;
      },
      getTotalIncome: () => {
        return get()
          .transactions.filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
      },
      getTotalExpense: () => {
        return get()
          .transactions.filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
      },
    }),
    {
      name: 'apexa_mobile_finance',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
