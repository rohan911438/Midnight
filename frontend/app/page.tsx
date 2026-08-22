'use client';

import { useEffect, useState } from 'react';
import { api, type Order, type MatchRecord } from '@/lib/api';
import { isWalletConnected, disconnectWallet } from '@/lib/wallet';
import { WalletConnect } from '@/components/WalletConnect';
import { SwapForm } from '@/components/SwapForm';
import { OrderList } from '@/components/OrderList';
import { MatchPanel } from '@/components/MatchPanel';
import { BeforeAfterPanel } from '@/components/BeforeAfterPanel';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [laceConnected, setLaceConnected] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [buyOrderId, setBuyOrderId] = useState<string | null>(null);
  const [sellOrderId, setSellOrderId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<MatchRecord | null>(null);

  async function refreshOrders() {
    try {
      setOrders(await api.listOrders());
    } catch {
      // backend not reachable yet -- fine, user hasn't started it
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    refreshOrders();
    const id = setInterval(refreshOrders, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <main>
      <WalletConnect
        address={walletAddress}
        onConnect={(addr) => {
          setWalletAddress(addr);
          setLaceConnected(isWalletConnected());
        }}
        onDisconnect={() => {
          disconnectWallet();
          setWalletAddress(null);
          setLaceConnected(false);
        }}
      />

      {walletAddress && (
        <>
          <div style={{ height: 20 }} />
          <SwapForm
            walletAddress={walletAddress}
            laceConnected={laceConnected}
            onSubmitted={(order) => setOrders((prev) => [order, ...prev])}
          />

          <div style={{ height: 20 }} />
          <OrderList
            orders={orders}
            loading={ordersLoading}
            selectedBuyId={buyOrderId}
            selectedSellId={sellOrderId}
            onSelectBuy={setBuyOrderId}
            onSelectSell={setSellOrderId}
          />

          <div style={{ height: 20 }} />
          <MatchPanel
            buyOrderId={buyOrderId}
            sellOrderId={sellOrderId}
            onMatched={(match) => {
              setActiveMatch(match);
              refreshOrders();
            }}
          />

          <div style={{ height: 20 }} />
          <BeforeAfterPanel
            match={activeMatch}
            onSettled={(match) => {
              setActiveMatch(match);
              refreshOrders();
            }}
          />
        </>
      )}
    </main>
  );
}
