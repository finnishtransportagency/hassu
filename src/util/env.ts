import { PublicEnv, FullEnv } from 'types/env';

/**
 * Voi käyttää selaimessa tai palvelimella
 * TODO: virheenkäsittely
 */
export function getPublicEnv<K extends keyof PublicEnv>(key: K): PublicEnv[K] {
  if (typeof window !== 'undefined') {
    const env = window.__ENV?.[key];
    return env as PublicEnv[K];
  }

  return (process.env as any)[key] as PublicEnv[K];
}

/**
 * Käytä tätä vain getServerSidePropsissa tai API-reiteissä.
 * TODO: virheenkäsittely
 */
export function getServerEnv<K extends keyof FullEnv>(key: K): FullEnv[K] {
  
  return (process.env as any)[key] as FullEnv[K];
}
