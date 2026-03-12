// ========================================================
// main.tsx — Application entry point
//
// Wraps the app with:
//   1. Leo Wallet adapter providers (wallet connection + modal UI)
//   2. GhostPay application state provider (records, transactions)
//
// The Leo Wallet adapter handles all wallet operations:
//   - Connecting / disconnecting the Leo Wallet browser extension
//   - Signing transactions (ZK proof generation happens in the wallet)
//   - Decrypting private records via the wallet's view key
//   - Requesting records from the Aleo network
// ========================================================

import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GhostPayProvider } from './context/WalletContext';
import './index.css';

// Leo Wallet adapter imports
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import {
  DecryptPermission,
  WalletAdapterNetwork,
} from '@demox-labs/aleo-wallet-adapter-base';

// Leo Wallet adapter default styles (provides the connect modal UI)
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css';

/**
 * Root component that initializes the Leo Wallet adapter.
 *
 * - `DecryptPermission.UponRequest`: prompts user each time we need to decrypt
 * - `WalletAdapterNetwork.TestnetBeta`: connects to current Aleo testnet
 * - `autoConnect`: re-connects if previously approved
 */
function Root() {
  // Memoize wallet adapters to prevent re-instantiation on re-renders
  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'GhostPay',
      }),
    ],
    [],
  );

  return (
    <React.StrictMode>
      <WalletProvider
        wallets={wallets}
        decryptPermission={DecryptPermission.UponRequest}
        network={WalletAdapterNetwork.TestnetBeta}
        autoConnect
      >
        <WalletModalProvider>
          <GhostPayProvider>
            <App />
          </GhostPayProvider>
        </WalletModalProvider>
      </WalletProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
