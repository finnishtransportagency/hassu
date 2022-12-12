import React, { createContext, ReactNode } from "react";
import { api } from "@services/api";
import { API } from "@services/api/commonApi";
import useSnackbars from "src/hooks/useSnackbars";
import { createApiWithAdditionalErrorHandling } from "@services/api/permanentApi";
import { ErrorResponse } from "apollo-link-error";
import { useRouter } from "next/router";
import useTranslation from "next-translate/useTranslation";
import { Translate } from "next-translate";

export const ApiContext = createContext<API>(api);

interface Props {
  children?: ReactNode;
}

type GenerateErrorMessage = (errorResponse: ErrorResponse, isYllapito: boolean, t: Translate) => string;
const generateErrorMessage: GenerateErrorMessage = (errorResponse, isYllapito, t) => {
  const operationName = errorResponse.operation.operationName;
  let errorMessage = isYllapito ? `Odottamaton virhe toiminnossa '${operationName}'.` : t("error:yleinen");

  // Ei nayteta korrelaatio IDeita kansalaisille
  const showCorrelationId = process.env.ENVIRONMENT !== "prod" || isYllapito;

  if (showCorrelationId) {
    const correlationId: string | undefined = (errorResponse.response?.errors?.[0] as any)?.errorInfo?.correlationId;
    errorMessage = errorMessage.concat(
      " ",
      `Välitä tunnistetieto '${correlationId}' järjestelmän ylläpitäjälle vikailmoituksen yhteydessä.`
    );
  }
  return errorMessage;
};

function ApiProvider({ children }: Props) {
  const { showErrorMessage } = useSnackbars();
  const router = useRouter();
  const isYllapito = router.asPath.startsWith("/yllapito");
  const { t } = useTranslation("error");

  return (
    <ApiContext.Provider
      value={createApiWithAdditionalErrorHandling((errorResponse) => {
        showErrorMessage(generateErrorMessage(errorResponse, isYllapito, t));
      })}
    >
      {children}
    </ApiContext.Provider>
  );
}

export { ApiProvider };
