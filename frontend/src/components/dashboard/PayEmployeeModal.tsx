import { useState } from "react";
import { type Address } from "viem";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useEncrypt } from "../../hooks/useCofhe";
import { usePayEmployee } from "../../hooks/useContract";
import { GHOSTPAY_ADDRESS, GHOSTPAY_ABI } from "../../lib/contract";
import { showToast, dismissToast } from "../ui/Toast";
import { useQueryClient } from "@tanstack/react-query";

interface PayEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  employeeAddress: Address | null;
}

export function PayEmployeeModal({ open, onClose, employeeAddress }: PayEmployeeModalProps) {
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [encrypting, setEncrypting] = useState(false);

  const { encryptUint32, isReady: cofheReady } = useEncrypt();
  const { payEmployee, isPending, isConfirming } = usePayEmployee();
  const queryClient = useQueryClient();

  const validate = () => {
    const errs: Record<string, string> = {};
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) {
      errs.amount = "Enter a positive number";
    }
    if (num > 4294967295) {
      errs.amount = "Value exceeds uint32 max";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !employeeAddress) return;

    setEncrypting(true);
    const toastId = showToast("Encrypting payment amount...", "pending");

    try {
      const encryptedAmount = await encryptUint32(Number(amount));
      dismissToast(toastId);
      const txToastId = showToast("Confirm transaction in wallet...", "pending");

      payEmployee(
        {
          address: GHOSTPAY_ADDRESS,
          abi: GHOSTPAY_ABI,
          functionName: "payEmployee",
          args: [employeeAddress, encryptedAmount],
        },
        {
          onSuccess: () => {
            dismissToast(txToastId);
            showToast("Payment sent successfully!", "success");
            queryClient.invalidateQueries();
            handleClose();
          },
          onError: (err) => {
            dismissToast(txToastId);
            showToast(err.message.slice(0, 80), "error");
          },
        },
      );
    } catch (err) {
      dismissToast(toastId);
      showToast(err instanceof Error ? err.message : "Encryption failed", "error");
    } finally {
      setEncrypting(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setErrors({});
    onClose();
  };

  const busy = encrypting || isPending || isConfirming;

  return (
    <Modal open={open} onClose={handleClose} title="Pay Employee">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-surface-300">Employee</label>
          <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-400 font-mono">
            {employeeAddress ? `${employeeAddress.slice(0, 6)}...${employeeAddress.slice(-4)}` : "—"}
          </div>
        </div>
        <Input
          id="pay-amount"
          label="Payment Amount"
          type="number"
          placeholder="e.g. 5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          disabled={busy}
        />

        {!cofheReady && (
          <p className="text-xs text-warning">Encryption client is initializing...</p>
        )}

        <div className="flex items-center justify-end gap-3 mt-2">
          <Button variant="ghost" onClick={handleClose} disabled={busy} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={busy} disabled={!cofheReady || busy}>
            {encrypting ? "Encrypting..." : isPending ? "Confirm in Wallet" : isConfirming ? "Confirming..." : "Send Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
