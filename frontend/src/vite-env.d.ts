/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALEO_NETWORK_URL: string;
  readonly VITE_GHOSTPAY_PROGRAM_ID: string;
  readonly VITE_ALEO_NETWORK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

