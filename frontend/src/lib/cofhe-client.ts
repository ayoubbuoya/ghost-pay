import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { chains } from "@cofhe/sdk/chains";

const config = createCofheConfig({
  supportedChains: [chains.arbSepolia],
});

let clientInstance: ReturnType<typeof createCofheClient> | null = null;

export function getCofheClient() {
  if (!clientInstance) {
    clientInstance = createCofheClient(config);
  }
  return clientInstance;
}
