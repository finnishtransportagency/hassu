import { PublicEnv } from "types/env";

/**
 * Hakee julkisen ympäristömuuttujan sekä client- että server-puolella.
 *
 * Tämä funktio on tarkoitettu käytettäväksi client-side koodissa, kuten
 * React-komponenteissa, jotka renderöidään selaimessa. Next.js renderöi HTML:n
 * jo palvelimella (server-side rendering), ja komponentit hydratoidaan clientilla.
 *
 * @param key Ympäristömuuttujan avain
 * @returns Arvo joko clientin runtime __ENV:stä tai serverin process.env:stä
 */
export function getPublicEnv<K extends keyof PublicEnv>(key: K): PublicEnv[K] {
  if (typeof window !== "undefined") {
    const env = window.__ENV?.[key];
    return env as PublicEnv[K];
  }
  // ilman tätä tulee hydration mismatch virheitä
  return (process.env as any)[key] as PublicEnv[K];
}
