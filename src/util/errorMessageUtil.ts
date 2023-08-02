import { concatCorrelationIdToErrorMessage } from "@components/ApiProvider";
import { ErrorResponse } from "apollo-link-error";
import { Translate } from "next-translate";
import { GraphQLError } from "graphql/error/GraphQLError";

type GenerateErrorMessage = (props: GenerateErrorMessageProps) => string;
type GenerateErrorMessageProps = { errorResponse: ErrorResponse; isYllapito: boolean; t: Translate };

const generateGenericErrorMessage: GenerateErrorMessage = ({ errorResponse, isYllapito, t }) => {
  const operationName = errorResponse.operation.operationName;
  return isYllapito ? `Odottamaton virhe toiminnossa '${operationName}'.` : t("error:yleinen");
};

type ErrorCodeAndClass = {
  httpErrorCode: string | null;
  errorClassName: string | null;
  httpErrorMessage: string | null;
};

function extractErrorInfo(e: GraphQLError): ErrorCodeAndClass {
  const splitted = e.message.split(";");
  const errorClassName = splitted.length > 0 ? splitted[0] : "";
  const httpErrorCode = splitted.length > 1 ? splitted[1] : "";
  const httpErrorMessage = splitted.length > 2 ? splitted[2] : "";

  return {
    httpErrorCode: httpErrorCode,
    errorClassName: errorClassName,
    httpErrorMessage: httpErrorMessage,
  };
}

export const generateErrorMessage: GenerateErrorMessage = (props) => {
  console.log("generateErrorMessage");
  console.log(props);
  const errorCodesAndClasses = props.errorResponse.graphQLErrors?.map((e) => extractErrorInfo(e));
  console.log(errorCodesAndClasses);

  const velhoUnavailableError = errorCodesAndClasses?.find((e: ErrorCodeAndClass) => e.errorClassName === "VelhoUnavailableError");
  const velhoError = errorCodesAndClasses?.find((e: ErrorCodeAndClass) => e.errorClassName === "VelhoError");
  const loadProjektiYllapitoError = errorCodesAndClasses?.find((e: ErrorCodeAndClass) => e.errorClassName === "LoadProjektiYllapitoError");

  let errorMessage;

  // Ei nayteta korrelaatio IDeita kansalaisille
  const showErrorDetails = process.env.ENVIRONMENT !== "prod" || props.isYllapito;

  if (velhoUnavailableError) {
    errorMessage = "Projektivelhoon ei saatu yhteyttä. ";
    if (showErrorDetails) {
      errorMessage += velhoUnavailableError.httpErrorCode + " " + velhoUnavailableError.httpErrorMessage + ". ";
    }
  }

  if (velhoError) {
    errorMessage = "Virhe Velho-haussa. ";
    if (showErrorDetails) {
      errorMessage += velhoError.httpErrorCode + " " + velhoError.httpErrorMessage + ". ";
    }
  }

  if (loadProjektiYllapitoError) {
    errorMessage = "Virhe projektin latauksessa. ";
    if (showErrorDetails) {
      errorMessage += loadProjektiYllapitoError.httpErrorCode + " " + loadProjektiYllapitoError.httpErrorMessage + ". ";
    }
  }

  if (!errorMessage) {
    errorMessage = generateGenericErrorMessage(props);
  }

  if (showErrorDetails) {
    errorMessage = concatCorrelationIdToErrorMessage(errorMessage, props.errorResponse.response?.errors);
  }
  return errorMessage;
};
