import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'GhostPay',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [arbitrumSepolia],
});
