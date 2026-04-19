import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { GHOSTPAY_ADDRESS, GHOSTPAY_ABI } from "../lib/contract";

export function useEmployeeCount() {
  return useReadContract({
    address: GHOSTPAY_ADDRESS,
    abi: GHOSTPAY_ABI,
    functionName: "getEmployeeCount",
  });
}

export function useEmployeeList() {
  return useReadContract({
    address: GHOSTPAY_ADDRESS,
    abi: GHOSTPAY_ABI,
    functionName: "getEmployeeList",
  });
}

export function useEmployeeData(employeeAddress: `0x${string}`) {
  return useReadContract({
    address: GHOSTPAY_ADDRESS,
    abi: GHOSTPAY_ABI,
    functionName: "getEmployeeData",
    args: [employeeAddress],
  });
}

export function useContractOwner() {
  return useReadContract({
    address: GHOSTPAY_ADDRESS,
    abi: GHOSTPAY_ABI,
    functionName: "owner",
  });
}

export function useAddEmployee() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  return {
    addEmployee: writeContract,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

export function usePayEmployee() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  return {
    payEmployee: writeContract,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

export function useRemoveEmployee() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  return {
    removeEmployee: writeContract,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
