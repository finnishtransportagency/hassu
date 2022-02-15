export function formatProperNoun(text: string) {
  const firstCharactersInWords = new RegExp(/(?<=^|[^\p{L}])\p{L}/, "gu");
  const notFirstCharacterInWords = new RegExp(/(?<!^|[^\p{L}])\p{L}/, "gu");

  return text
    .trim()
    .replace(firstCharactersInWords, (a) => a.toUpperCase())
    .replace(notFirstCharacterInWords, (a) => a.toLowerCase());
}

export default { formatProperNoun };
