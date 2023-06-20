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
};

function extractErrorInfo(e: GraphQLError): ErrorCodeAndClass {
  const splitted = e.message.split(" ");
  const errorClassName = splitted.length > 0 ? splitted[0] : "";
  const httpErrorCode = splitted.length > 1 ? splitted[1] : "";

  return {
    httpErrorCode: httpErrorCode,
    errorClassName: errorClassName,
  };
}

export const generateErrorMessage: GenerateErrorMessage = (props) => {
  console.log("generateErrorMessage");
  console.log(props);
  const errorCodesAndClasses = props.errorResponse.graphQLErrors?.map((e) => extractErrorInfo(e));
  console.log(errorCodesAndClasses);

  const velhoUnavailableError = errorCodesAndClasses?.find((e: ErrorCodeAndClass) => e.errorClassName === "VelhoUnavailableError");
  //const velhoError = errorCodesAndClasses?.find((e:ErrorCodeAndClass) => e.errorClassName === "VelhoError");

  let errorMessage;

  if (velhoUnavailableError) {
    switch (velhoUnavailableError.httpErrorCode) {
      case "500":
        errorMessage = "HELLO 500";
        break;
      default:
        errorMessage = "HELLO 500";
    }
  }
  if (!errorMessage) {
    errorMessage = generateGenericErrorMessage(props);
  }
  // Ei nayteta korrelaatio IDeita kansalaisille
  const showCorrelationId = process.env.ENVIRONMENT !== "prod" || props.isYllapito;

  if (showCorrelationId) {
    errorMessage = concatCorrelationIdToErrorMessage(errorMessage, props.errorResponse.response?.errors);
  }
  return errorMessage;
};
