// Minimal Lace (Midnight) wallet connector. Falls back to manual address
// entry when no injected wallet extension is present, since the hackathon
// demo needs to work whether or not the judge has Lace installed.

declare global {
  interface Window {
    midnight?: {
      mnLace?: {
        isEnabled: () => Promise<boolean>;
        enable: () => Promise<{ state: () => Promise<{ address: string }> }>;
      };
    };
  }
}

export async function connectLaceWallet(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.midnight?.mnLace) return null;
  const api = await window.midnight.mnLace.enable();
  const state = await api.state();
  return state.address;
}

export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && Boolean(window.midnight?.mnLace);
}
