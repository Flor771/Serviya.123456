import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Wallet, WalletTransaction } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface WalletContextType {
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  loading: boolean;
  refreshWallet: () => Promise<void>;
  depositRD: (amount: number, method: string, cardLast4?: string) => Promise<void>;
  withdrawRD: (data: { amount_rd: number; bank_name: string; account_type: string; account_number: string; account_holder_name: string; account_holder_cedula: string }) => Promise<void>;
  payEscrow: (service_id: string) => Promise<void>;
  releaseEscrow: (service_id: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setTransactions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<{ wallet: Wallet; transactions: WalletTransaction[] }>('/wallet');
      setWallet(data.wallet);
      setTransactions(data.transactions);
    } catch (err) {
      console.error('Error loading wallet:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const depositRD = async (amount: number, method: string, cardLast4?: string) => {
    await api.post('/wallet/deposit', { amount_rd: amount, method, card_last_4: cardLast4 });
    await refreshWallet();
  };

  const withdrawRD = async (data: any) => {
    await api.post('/wallet/withdraw', data);
    await refreshWallet();
  };

  const payEscrow = async (service_id: string) => {
    await api.post('/payments/escrow', { service_id });
    await refreshWallet();
  };

  const releaseEscrow = async (service_id: string) => {
    await api.post('/payments/release', { service_id });
    await refreshWallet();
  };

  return (
    <WalletContext.Provider value={{ wallet, transactions, loading, refreshWallet, depositRD, withdrawRD, payEscrow, releaseEscrow }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
};
