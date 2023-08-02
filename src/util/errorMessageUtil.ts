import { concatCorrelationIdToErrorMessage } from "@components/ApiProvider";
import { ErrorResponse } from "apollo-link-error";
import { Translate } from "next-translate";
import { GraphQLError } from "graphql/error/GraphQLError";

type GenerateErrorMessage = (props: GenerateErrorMessageProps) => string;
type GenerateErrorMessageProps = { errorResponse: ErrorResponse; isYllapito: boolean; t: Translate };
type NonGenericErrorMessageValidator = (props: GenerateErrorMessageProps) => boolean;
type ErrorCodeAndClass = {
  httpErrorCode: string | null;
  errorClassName: string | null;
  httpErrorMessage: string | null;
};

const doThing = (errorResponse: ErrorResponse, searchString: string): ErrorCodeAndClass | undefined => {
  const errorCodesAndClasses = errorResponse.graphQLErrors?.map((e) => extractErrorInfo(e));
  console.log(errorCodesAndClasses);

  const errorCodeAndClass = errorCodesAndClasses?.find((e: ErrorCodeAndClass) => e.errorClassName === searchString);
  console.log(errorCodeAndClass);
  return errorCodeAndClass;
};

const checkThing = (errorResponse: ErrorResponse, searchString: string): boolean => {
  const errorCodeAndClass = doThing(errorResponse, searchString);
  if (errorCodeAndClass) {
    return true;
  } else {
    return false;
  }
};

// Ei nayteta korrelaatio IDeita kansalaisille
const showErrorDetails = (props: GenerateErrorMessageProps): boolean => process.env.ENVIRONMENT !== "prod" || props.isYllapito;

const nonGenericErrorMessages: { validator: NonGenericErrorMessageValidator; errorMessage: GenerateErrorMessage | string }[] = [
  {
    validator: ({ errorResponse }) => errorResponse.operation.operationName === "AnnaPalautettaPalvelusta",
    errorMessage: ({ t }) => t("error:anna-palautetta-palvelusta"),
  },
  {
    validator: ({ errorResponse }) => checkThing(errorResponse, "VelhoUnavailableError"),
    errorMessage: (props) => {
      const velhoUnavailableError = doThing(props.errorResponse, "VelhoUnavailableError");
      let errorMessage = "";
      if (velhoUnavailableError) {
        errorMessage = "Projektivelhoon ei saatu yhteyttä. ";
        if (showErrorDetails(props)) {
          errorMessage += velhoUnavailableError.httpErrorCode + " " + velhoUnavailableError.httpErrorMessage + ". ";
        }
      }
      return errorMessage;
    },
  },
];

const generateGenericErrorMessage: GenerateErrorMessage = ({ errorResponse, isYllapito, t }) => {
  const operationName = errorResponse.operation.operationName;
  return isYllapito ? `Odottamaton virhe toiminnossa '${operationName}'.` : t("error:yleinen");
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

  const matchingErrorMessages = nonGenericErrorMessages.filter((item) => item.validator(props));

  console.log(matchingErrorMessages);
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
