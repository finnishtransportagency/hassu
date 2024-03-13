export const getLocalizedCountryName = (lang: string, iso2CountryCode: string) => {
  const regionNames = new Intl.DisplayNames(lang, { type: "region" });
  return regionNames.of(iso2CountryCode) ?? iso2CountryCode;
};
