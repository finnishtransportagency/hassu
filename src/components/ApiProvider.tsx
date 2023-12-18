import React, { createContext, ReactNode, useMemo } from "react";
import { API } from "@services/api/commonApi";
import useSnackbars from "src/hooks/useSnackbars";
import { createApiWithAdditionalErrorHandling, ErrorResponseHandler, relativeEndpointAPI } from "@services/api/permanentApi";
import { ErrorResponse } from "apollo-link-error";
import { useRouter } from "next/router";
import useTranslation from "next-translate/useTranslation";
import { GraphQLError } from "graphql";
import { NoHassuAccessError, NoVaylaAuthenticationError } from "hassu-common/error";
import Cookies from "js-cookie";
import { useStoreKansalaisUserAuthentication } from "@services/userService";
import { generateErrorMessage } from "../util/errorMessageUtil";
import { SimultaneousUpdateError } from "hassu-common/error";

export const ApiContext = createContext<API>(relativeEndpointAPI);

interface Props {
  children?: ReactNode;
  updateIsUnauthorizedCallback: (isUnauthorized: boolean) => void;
  simultaneousUpdateErrorCallback: () => void;
}

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

function ApiProvider({ children, updateIsUnauthorizedCallback, simultaneousUpdateErrorCallback }: Props) {
  const { showErrorMessage } = useSnackbars();
  const router = useRouter();
  const isYllapito = router.asPath.startsWith("/yllapito");
  const { t } = useTranslation("error");
  useStoreKansalaisUserAuthentication(router);
  const value: API = useMemo(() => {
    const commonErrorHandler: ErrorResponseHandler = (errorResponse) => {
      showErrorMessage(generateErrorMessage({ errorResponse, isYllapito, t }));
    };
    const authenticatedErrorHandler: ErrorResponseHandler = (errorResponse: ErrorResponse) => {
      const errors = errorResponse.response?.errors as GraphQLError | readonly GraphQLError[] | undefined;
      if (!errors) {
        // No errors - no need for further handling - return
        return;
      }
      const errorArray: readonly GraphQLError[] = Array.isArray(errors) ? errors : [errors];
      const unauthorized = errorArray.some((error) => (error as any)?.errorInfo?.errorSubType === new NoHassuAccessError().className);
      const simultaneousUpdateError = errorArray.some(
        (error) => (error as any)?.errorInfo?.errorSubType === new SimultaneousUpdateError().className
      );
      updateIsUnauthorizedCallback(unauthorized);
      // Do not show snackbar errors on unauthorized 'page'
      if (!unauthorized && !simultaneousUpdateError) {
        commonErrorHandler(errorResponse);
      }
      if (simultaneousUpdateError) {
        simultaneousUpdateErrorCallback();
      }
      const noVaylaAuthentication = errorArray.some(
        (error) => (error as any)?.errorInfo?.errorSubType === new NoVaylaAuthenticationError().className
      );
      if (noVaylaAuthentication) {
        removeAWSALBAndCookieSessionCookies();
        router.push("/yllapito/kirjaudu");
      }
    };
    return createApiWithAdditionalErrorHandling(commonErrorHandler, authenticatedErrorHandler);
  }, [isYllapito, router, showErrorMessage, simultaneousUpdateErrorCallback, t, updateIsUnauthorizedCallback]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

function removeAWSALBAndCookieSessionCookies() {
  Object.keys(Cookies.get() || {})
    .filter((cookie) => cookie.startsWith("AWSALB") || cookie.startsWith("cookiesession"))
    .forEach((cookie) => {
      Cookies.remove(cookie);
    });
}

export { ApiProvider };
