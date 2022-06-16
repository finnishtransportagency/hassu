export function formatProperNoun(text: string) {
  // Ongelmana oli, ettei Safari tue lookaheadia ja looknehindia.
  // Talle ei nakynyt kayttoa muualla, kuin kuntanimien yhteydessa
  // joten uskon whitespacen ja valiviivan jalkeisella uppercasella
  // parjaavan (naita kuntiakin on vain yksi Mantta-Vilppula)
  const startOfWords = new RegExp(/(^|[\s-])\S/g);

  return text.trim().replace(startOfWords, (a) => a.toUpperCase());
}

export default { formatProperNoun };
