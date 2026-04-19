import { useState } from "react";
import { type Address } from "viem";

interface AddressDisplayProps {
  address: Address;
}

export function AddressDisplay({ address }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-sm text-surface-300 hover:text-ghost-200 transition-colors cursor-pointer"
      title={address}
    >
      {copied ? "Copied!" : truncated}
    </button>
  );
}
