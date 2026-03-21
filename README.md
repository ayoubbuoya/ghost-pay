# 👻 GhostPay: Private By Design Payroll for Web3

**GhostPay** is an enterprise-grade, privacy-first payroll system built natively on **Fhenix**. It allows Web3 companies and DAOs to pay their teams on-chain without doxxing individual salaries to the public.

## 🛑 The Problem: The Institutional Gap

Public blockchains are transparent by default. If a Web3 company uses a regular EVM network to run payroll, anyone in the world (including competitors) can look at the blockchain and see exactly how much every employee is making.

Because of this **"institutional gap,"** real businesses refuse to run their internal operations on-chain. They are forced to use centralized Web2 payroll services, completely defeating the purpose of crypto.

## 💡 The Solution: FHE Payroll

GhostPay uses **Fully Homomorphic Encryption (FHE)** via the Fhenix CoFHE stack to solve this.
Instead of doing complex math off-chain and submitting Zero-Knowledge proofs, GhostPay computes payroll directly on the blockchain using encrypted numbers.

- **Publicly Verifiable:** The blockchain verifies that the employer has enough funds and that the math adds up.
- **Privately Executed:** The actual salary amounts, tax deductions, and employee balances stay 100% encrypted (`euint32`).
- **No ZK Circuits:** Developers just write normal Solidity, and the FHE coprocessor handles the privacy.

---

## 🛠️ Tech Stack & Architecture

- **Smart Contracts:** Solidity + `@fhenixprotocol/cofhe-contracts`
- **FHE Logic:** Encrypted state variables (`euint32`, `euint64`), homomorphic addition/subtraction.
- **Frontend:** Next.js, React, TailwindCSS.
- **Client Encryption:** `fhenix.js` / `@cofhe/react` hooks (`useEncrypt`, `useDecrypt`).
- **Network:** Fhenix Sepolia Testnet.

### How it _Exactly_ Works (For AI Agents & Devs)

1. **Encryption at the Edge:** When an employer adds an employee, the frontend uses Fhenix's `useEncrypt` hook to turn the base salary into an encrypted payload (`InEuint32`).
2. **On-Chain Storage:** The smart contract receives the payload, converts it using `FHE.asEuint32()`, and stores it in a private mapping. The blockchain never sees the plaintext number.
3. **Encrypted Arithmetic:** When the employer deposits the payroll budget, the contract uses `FHE.add()` to verify the total budget can cover all encrypted salaries without revealing what those salaries are.
4. **Decryption Permits:** Employees sign a CoFHE permit message to view their own balance. The contract uses `FHE.allowSender()` to let _only_ that specific employee's wallet decrypt their payload using `useDecrypt`.

---

## 👥 User Flows

### 1. The Employer Flow (Company Admin)

1. Deploys the `GhostPayFactory` contract for their company.
2. Registers employees by inputting their wallet addresses and base salaries into the frontend.
3. The frontend encrypts the salaries before sending the transaction.
4. The employer deposits USDC (or a mock stablecoin) into the contract vault.
5. Clicks **"Run Payroll"** -> The smart contract securely maps the encrypted funds to the employees' encrypted balances.

### 2. The Employee Flow

1. Connects their wallet to the GhostPay dashboard.
2. Signs a cryptographic permit (gasless) to prove their identity to the Fhenix coprocessor.
3. The dashboard decrypts _only their specific data_, showing their current available balance.
4. The employee clicks **"Withdraw"** to move the funds to their personal wallet.