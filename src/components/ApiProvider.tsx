import React, { createContext, ReactNode, useMemo } from "react";
import { API } from "@services/api/commonApi";
import useSnackbars from "src/hooks/useSnackbars";
import { createApiWithAdditionalErrorHandling, ErrorResponseHandler, relativeEndpointAPI } from "@services/api/permanentApi";
import { ErrorResponse } from "apollo-link-error";
import { useRouter } from "next/router";
import useTranslation from "next-translate/useTranslation";
import { Translate } from "next-translate";
import { GraphQLError } from "graphql";
import { NoHassuAccessError } from "backend/src/error/NoHassuAccessError";
import { NoVaylaAuthenticationError } from "backend/src/error/NoVaylaAuthenticationError";
import Cookies from "js-cookie";

export const ApiContext = createContext<API>(relativeEndpointAPI);

interface Props {
  children?: ReactNode;
  updateIsUnauthorizedCallback: (isUnauthorized: boolean) => void;
}

type GenerateErrorMessageProps = { errorResponse: ErrorResponse; isYllapito: boolean; t: Translate };
type GenerateErrorMessage = (props: GenerateErrorMessageProps) => string;
// type NonGenericErrorMessageValidator = (props: GenerateErrorMessageProps) => boolean;
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

const generateGenericErrorMessage: GenerateErrorMessage = ({ errorResponse, isYllapito, t }) => {
  const operationName = errorResponse.operation.operationName;
  return isYllapito ? `Odottamaton virhe toiminnossa '${operationName}'.` : t("error:yleinen");
};

// const nonGenericErrorMessages: { validator: NonGenericErrorMessageValidator; errorMessage: GenerateErrorMessage | string }[] = [
//   // Esimerkki
//   // {
//   //   validator: ({ errorResponse }) => errorResponse.operation.operationName === "AnnaPalautettaPalvelusta",
//   //   errorMessage: ({ t }) => t("error:anna-palautetta-palvelusta"),
//   // },
// ];

const generateErrorMessage: GenerateErrorMessage = (props) => {
  // const message = nonGenericErrorMessages.find(({ validator }) => !!validator(props));
  let errorMessage =
    // message?.errorMessage
    //   ? typeof message.errorMessage === "string"
    //     ? message.errorMessage
    //     : message.errorMessage(props)
    //   :
    generateGenericErrorMessage(props);

  // Ei nayteta korrelaatio IDeita kansalaisille
  const showCorrelationId = process.env.ENVIRONMENT !== "prod" || props.isYllapito;

  if (showCorrelationId) {
    errorMessage = concatCorrelationIdToErrorMessage(errorMessage, props.errorResponse.response?.errors);
  }
  return errorMessage;
};

function ApiProvider({ children, updateIsUnauthorizedCallback }: Props) {
  const { showErrorMessage } = useSnackbars();
  const router = useRouter();
  const isYllapito = router.asPath.startsWith("/yllapito");
  const { t } = useTranslation("error");

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
      updateIsUnauthorizedCallback(unauthorized);
      // Do not show snackbar errors on unauthorized 'page'
      if (!unauthorized) {
        commonErrorHandler(errorResponse);
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
  }, [isYllapito, router, showErrorMessage, t, updateIsUnauthorizedCallback]);

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
