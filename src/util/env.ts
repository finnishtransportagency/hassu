import { PublicEnv } from "types/env";

const REACT_KEYS: (keyof PublicEnv)[] = ["REACT_APP_API_URL", "REACT_APP_API_KEY"];

/**
 * Tarkistaa, että ympäristömuuttujaa ei käytetä väärin build-aikana.
 * Heittää virheen ja lopettaa buildin, jos ei-sallittu avain havaitaan.
 */
function validateBuildPhaseAccess(key: keyof PublicEnv): void {
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    return;
  }

  // REACT_APP* avaimia käytetään buildin Collecting page data vaiheen aikana,
  // joten niitä ei voi lisätä tähän luotettavasti
  if (!REACT_KEYS.includes(key)) {
    console.error(`\x1b[31m✗\x1b[0m [BUILD ERROR] getPublicEnv() called during static page generation for key: ${key}`);
    console.error(
      `\x1b[31m✗\x1b[0m This will cause hydration mismatches. Use getServerSideProps in page level or dynamic imports with ssr: false for specific component.`
    );
    process.exit(1);
  }
}

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

  validateBuildPhaseAccess(key);

  return (process.env as any)[key] as PublicEnv[K];
}
