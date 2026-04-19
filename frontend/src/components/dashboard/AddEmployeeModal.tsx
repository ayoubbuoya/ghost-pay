import { useState } from "react";
import { type Address } from "viem";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useEncrypt } from "../../hooks/useCofhe";
import { useAddEmployee } from "../../hooks/useContract";
import { GHOSTPAY_ADDRESS, GHOSTPAY_ABI } from "../../lib/contract";
import { showToast, dismissToast } from "../ui/Toast";
import { useQueryClient } from "@tanstack/react-query";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddEmployeeModal({ open, onClose }: AddEmployeeModalProps) {
  const [employeeAddress, setEmployeeAddress] = useState("");
  const [salary, setSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [encrypting, setEncrypting] = useState(false);

  const { encryptUint32, isReady: cofheReady } = useEncrypt();
  const { addEmployee, isPending, isConfirming } = useAddEmployee();
  const queryClient = useQueryClient();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!employeeAddress.startsWith("0x") || employeeAddress.length !== 42) {
      errs.address = "Enter a valid Ethereum address";
    }
    const salaryNum = Number(salary);
    if (!salary || isNaN(salaryNum) || salaryNum <= 0) {
      errs.salary = "Enter a positive number";
    }
    if (salaryNum > 4294967295) {
      errs.salary = "Value exceeds uint32 max";
    }
    const bonusNum = Number(bonus);
    if (!bonus || isNaN(bonusNum) || bonusNum <= 0) {
      errs.bonus = "Enter a positive number";
    }
    if (bonusNum > 4294967295) {
      errs.bonus = "Value exceeds uint32 max";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setEncrypting(true);
    const toastId = showToast("Encrypting salary & bonus...", "pending");

    try {
      const [encryptedSalary, encryptedBonus] = await Promise.all([
        encryptUint32(Number(salary)),
        encryptUint32(Number(bonus)),
      ]);

      dismissToast(toastId);
      const txToastId = showToast("Confirm transaction in wallet...", "pending");

      addEmployee(
        {
          address: GHOSTPAY_ADDRESS,
          abi: GHOSTPAY_ABI,
          functionName: "addEmployee",
          args: [employeeAddress as Address, encryptedSalary, encryptedBonus],
        },
        {
          onSuccess: () => {
            dismissToast(txToastId);
            showToast("Employee added successfully!", "success");
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
    setEmployeeAddress("");
    setSalary("");
    setBonus("");
    setErrors({});
    onClose();
  };

  const busy = encrypting || isPending || isConfirming;

  return (
    <Modal open={open} onClose={handleClose} title="Add Employee">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="emp-address"
          label="Employee Address"
          placeholder="0x..."
          value={employeeAddress}
          onChange={(e) => setEmployeeAddress(e.target.value)}
          error={errors.address}
          disabled={busy}
        />
        <Input
          id="emp-salary"
          label="Annual Salary"
          type="number"
          placeholder="e.g. 85000"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          error={errors.salary}
          disabled={busy}
        />
        <Input
          id="emp-bonus"
          label="Bonus"
          type="number"
          placeholder="e.g. 5000"
          value={bonus}
          onChange={(e) => setBonus(e.target.value)}
          error={errors.bonus}
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
            {encrypting ? "Encrypting..." : isPending ? "Confirm in Wallet" : isConfirming ? "Confirming..." : "Add Employee"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
