import React, { createContext, ReactNode, useMemo } from "react";
import { api } from "@services/api";
import { API } from "@services/api/commonApi";
import useSnackbars from "src/hooks/useSnackbars";
import { createApiWithAdditionalErrorHandling, ErrorResponseHandler } from "@services/api/permanentApi";
import { ErrorResponse } from "apollo-link-error";
import { useRouter } from "next/router";
import useTranslation from "next-translate/useTranslation";
import { Translate } from "next-translate";
import { GraphQLError } from "graphql";

export const ApiContext = createContext<API>(api);

interface Props {
  children?: ReactNode;
}

type GenerateErrorMessage = (errorResponse: ErrorResponse, isYllapito: boolean, t: Translate) => string;
type ConcatCorrelationIdToErrorMessage = (message: string, error?: GraphQLError | GraphQLError[] | readonly GraphQLError[]) => string;

export const concatCorrelationIdToErrorMessage: ConcatCorrelationIdToErrorMessage = (message, error) => {
  if (!error) {
    return message;
  }

  const correlationId: string | undefined = Array.isArray(error)
    ? (error?.[0] as any)?.errorInfo?.correlationId
    : (error as any)?.errorInfo?.correlationId;
  return message.concat(" ", `Välitä tunnistetieto '${correlationId}' järjestelmän ylläpitäjälle vikailmoituksen yhteydessä.`);
};

const generateGenericErrorMessage: GenerateErrorMessage = (errorResponse, isYllapito, t) => {
  const operationName = errorResponse.operation.operationName;
  let errorMessage = isYllapito ? `Odottamaton virhe toiminnossa '${operationName}'.` : t("error:yleinen");

  // Ei nayteta korrelaatio IDeita kansalaisille
  const showCorrelationId = process.env.ENVIRONMENT !== "prod" || isYllapito;

  if (showCorrelationId) {
    errorMessage = concatCorrelationIdToErrorMessage(errorMessage, errorResponse.response?.errors);
  }
  return errorMessage;
};

function ApiProvider({ children }: Props) {
  const { showErrorMessage } = useSnackbars();
  const router = useRouter();
  const isYllapito = router.asPath.startsWith("/yllapito");
  const { t } = useTranslation("error");

  const value: API = useMemo(() => {
    const errorHandler: ErrorResponseHandler = (errorResponse) => {
      showErrorMessage(generateGenericErrorMessage(errorResponse, isYllapito, t));
    };
    return createApiWithAdditionalErrorHandling(errorHandler);
  }, [isYllapito, showErrorMessage, t]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export { ApiProvider };
