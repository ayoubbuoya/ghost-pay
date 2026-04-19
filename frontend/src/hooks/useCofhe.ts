import { Encryptable, FheTypes } from "@cofhe/sdk";
import { useCofhe } from "../providers/CofheProvider";
import { getCofheClient } from "../lib/cofhe-client";
import type { InEuint32 } from "../lib/contract";

export function useEncrypt() {
  const { isReady } = useCofhe();

  async function encryptUint32(value: number): Promise<InEuint32> {
    if (!isReady) throw new Error("CoFHE client not ready");
    const client = getCofheClient();
    const [encrypted] = await client
      .encryptInputs([Encryptable.uint32(BigInt(value))])
      .execute();
    return encrypted as InEuint32;
  }

  return { encryptUint32, isReady };
}

export function useDecrypt() {
  const { isReady } = useCofhe();

  async function decryptBytes32(ctHash: `0x${string}`): Promise<number | null> {
    if (!isReady) return null;
    const client = getCofheClient();
    await client.permits.getOrCreateSelfPermit();
    const result = await client
      .decryptForView(ctHash, FheTypes.Uint32)
      .execute();
    return Number(result);
  }

  return { decryptBytes32, isReady };
}
