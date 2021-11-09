import React, { ReactNode } from "react";
import I18nProvider from "next-translate/I18nProvider";
import i18nConfig, { defaultLocale } from "../i18n";
import loadNamespaces from "next-translate/loadNamespaces";
import { I18nDictionary } from "next-translate";

const getAllNamespaces = () =>
  Object.values(i18nConfig.pages).reduce((namespaces, pageNamespaces) => {
    pageNamespaces.forEach((item) => !namespaces.some((ns) => ns === item) && namespaces.push(item));
    return namespaces;
  }, []);

export async function componentWithTranslation(children: ReactNode) {
  const config = {
    ...i18nConfig,
    pathname: "*",
    pages: {
      "*": getAllNamespaces(),
    },
    loader: false,
  };
  const { __namespaces } = await loadNamespaces(config);
  return (
    <I18nProvider lang={defaultLocale} namespaces={__namespaces as Record<string, I18nDictionary>}>
      {children}
    </I18nProvider>
  );
}
