import { PublicEnv } from "types/env";

/**
 * Käytetään selainpuolen koodissa ympäristömuuttujien hakemiseen
 */
export function getPublicEnv<K extends keyof PublicEnv>(key: K): PublicEnv[K] {
  if (typeof window !== "undefined") {
    const env = window.__ENV?.[key];
    return env as PublicEnv[K];
  }

  return (process.env as any)[key] as PublicEnv[K];
}
