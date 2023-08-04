import { concatCorrelationIdToErrorMessage } from "@components/ApiProvider";
import { ErrorResponse } from "apollo-link-error";
import { Translate } from "next-translate";
import { GraphQLError } from "graphql/error/GraphQLError";

type GenerateErrorMessage = (props: GenerateErrorMessageProps) => string;
type GenerateErrorMessageProps = { errorResponse: ErrorResponse; isYllapito: boolean; t: Translate };
type NonGenericErrorMessageValidator = (props: GenerateErrorMessageProps) => boolean;
type ErrorInfo = {
  errorClassName: string | null;
  errorMessage: string | null;
};

const getMatchingErrorInfo = (errorResponse: ErrorResponse, searchString: string): ErrorInfo | undefined => {
  const errorInfos = errorResponse.graphQLErrors?.map((e) => extractErrorInfo(e));
  console.log(errorInfos);

  const errorInfo = errorInfos?.find((e: ErrorInfo) => e.errorClassName === searchString);
  console.log(errorInfo);
  return errorInfo;
};

const matchErrorClass = (errorResponse: ErrorResponse, searchString: string): boolean => {
  const errorInfo = getMatchingErrorInfo(errorResponse, searchString);
  if (errorInfo) {
    return true;
  } else {
    return false;
  }
};

const constructErrorMessage = (props: GenerateErrorMessageProps, errorClassName: string, message: string): string => {
  const errorInfo = getMatchingErrorInfo(props.errorResponse, errorClassName);
  let errorMessage = "";
  if (errorInfo) {
    errorMessage = message;
    if (showErrorDetails(props)) {
      errorMessage += errorInfo.errorMessage + ". ";
    }
  }
  return errorMessage;
};

// Ei nayteta korrelaatio IDeita kansalaisille
const showErrorDetails = (props: GenerateErrorMessageProps): boolean => process.env.ENVIRONMENT !== "prod" || props.isYllapito;

const nonGenericErrorMessages: { validator: NonGenericErrorMessageValidator; errorMessage: GenerateErrorMessage }[] = [
  {
    validator: ({ errorResponse }) => errorResponse.operation.operationName === "AnnaPalautettaPalvelusta",
    errorMessage: ({ t }) => t("error:anna-palautetta-palvelusta"),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "VelhoUnavailableError"),
    errorMessage: (props) => constructErrorMessage(props, "VelhoUnavailableError", "Projektivelhoon ei saatu yhteyttä. "),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "VelhoError"),
    errorMessage: (props) => constructErrorMessage(props, "VelhoError", "Virhe Velho-haussa. "),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "LoadProjektiYllapitoError"),
    errorMessage: (props) => constructErrorMessage(props, "LoadProjektiYllapitoError", "Projektin lataus epäonnistui. "),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "LoadProjektiYllapitoIllegalAccessError"),
    errorMessage: () => "Vain L ja A tunnuksella voi luoda uusia projekteja. ",
  },
];

const generateGenericErrorMessage: GenerateErrorMessage = ({ errorResponse, isYllapito, t }) => {
  const operationName = errorResponse.operation.operationName;
  return isYllapito ? `Odottamaton virhe toiminnossa '${operationName}'.` : t("error:yleinen");
};

function extractErrorInfo(e: GraphQLError): ErrorInfo {
  const splitted = e.message.split(";");
  const errorClassName = splitted.length > 0 ? splitted[0] : "";
  const errorMessage = splitted.length > 1 ? splitted[1] : "";

  return {
    errorClassName: errorClassName,
    errorMessage: errorMessage,
  };
}

export const generateErrorMessage: GenerateErrorMessage = (props) => {
  console.log("generateErrorMessage");
  console.log(props);

  const matchingErrorMessages = nonGenericErrorMessages.filter((item) => item.validator(props));
  console.log("matchingErrorMessages");
  console.log(matchingErrorMessages);

  let errorMessage = nonGenericErrorMessages.find((item) => item.validator(props))?.errorMessage(props);

  if (!errorMessage) {
    errorMessage = generateGenericErrorMessage(props);
  }

  // Ei nayteta korrelaatio IDeita kansalaisille
  if (showErrorDetails(props)) {
    errorMessage = concatCorrelationIdToErrorMessage(errorMessage, props.errorResponse.response?.errors);
  }
  return errorMessage;
};
