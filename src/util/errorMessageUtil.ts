import { concatCorrelationIdToErrorMessage } from "@components/ApiProvider";
import { ErrorResponse } from "@apollo/client/link/error";
import { Translate } from "next-translate";
import { GraphQLFormattedError } from "graphql";

type GenerateErrorMessage = (props: GenerateErrorMessageProps) => string;
type GenerateErrorMessageProps = { errorResponse: ErrorResponse; isYllapito: boolean; t: Translate };
type NonGenericErrorMessageValidator = (props: GenerateErrorMessageProps) => boolean;
type ErrorInfo = {
  errorClassName: string | null;
  errorMessage: string | null;
};

// Ei nayteta korrelaatio IDeita eikä virheyksityiskohtia kansalaisille tuotanto- ja koulutusympäristöissä
const showErrorDetails = (props: GenerateErrorMessageProps): boolean =>
  (process.env.NEXT_PUBLIC_ENVIRONMENT !== "prod" && process.env.NEXT_PUBLIC_ENVIRONMENT !== "training") || props.isYllapito;

// Jos halutaan näyttää ei-geneerinen virheviesti api-virheestä,
// lisätään tähän arrayhin validator ja errorMessage -pari.
// ErrorResponseen mätsääviin validaattoreihin kuuluva errorMessage näytetään.
// Säännöt käydään järjestyksessä läpi ja kaikki mätsäävät viestit näytetetään.
// Käytännössä tarkoitaa että ensin saadaan operaatiospesifinen viest ja sitten errorClass-spesifinen. (jos saatavilla)

const nonGenericErrorMessages: { validator: NonGenericErrorMessageValidator; errorMessage: GenerateErrorMessage }[] = [
  {
    validator: ({ errorResponse }) => {
      return (
        errorResponse.operation.operationName === "EsikatseleHyvaksyttavaHyvaksymisEsityksenTiedostot" ||
        errorResponse.operation.operationName === "EsikatseleHyvaksymisEsityksenTiedostot"
      );
    },
    errorMessage: ({ errorResponse }) => {
      const errorMsg = errorResponse.graphQLErrors?.[0].message ? " " + errorResponse.graphQLErrors?.[0].message : "";
      return "Esikatselussa tapahtui virhe.".concat(errorMsg);
    },
  },
  {
    validator: ({ errorResponse }) => {
      return errorResponse.operation.operationName === "AnnaPalautettaPalvelusta";
    },
    errorMessage: ({ t }) => t("error:anna-palautetta-palvelusta"),
  },
  {
    validator: ({ errorResponse }) => {
      return errorResponse.operation.operationName === "LataaProjekti";
    },
    errorMessage: () => "Projektin lataus epäonnistui.",
  },
  {
    validator: ({ errorResponse }) => {
      return errorResponse.operation.operationName === "TallennaProjekti";
    },
    errorMessage: () => "Projektin tallennus epäonnistui.",
  },
  {
    validator: ({ errorResponse }) => {
      return (
        errorResponse.operation.variables.tilasiirtyma?.toiminto === "LAHETA_HYVAKSYTTAVAKSI" &&
        errorResponse.operation.operationName === "TallennaJaSiirraTilaa"
      );
    },
    errorMessage: () => "Virhe hyväksyttäväksi lähetyksessä.",
  },
  {
    validator: ({ errorResponse }) => {
      return errorResponse.operation.operationName === "TallennaKiinteistonOmistajat";
    },
    errorMessage: () => "Kiinteistönomistajatietojen tallennus epäonnistui.",
  },
  {
    validator: ({ errorResponse }) => errorResponse.operation.operationName === "TallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi",
    errorMessage: () => "Hyväksymisesityksen hyväksyttäväksi lähetys epäonnistui.",
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "VelhoUnavailableError"),
    errorMessage: (props) => constructErrorClassSpecificErrorMessage(props, "VelhoUnavailableError", "Projektivelhoon ei saatu yhteyttä."),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "VelhoError"),
    errorMessage: (props) => constructErrorClassSpecificErrorMessage(props, "VelhoError", "Velho palautti virheen."),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "IllegalAccessError"),
    errorMessage: (props) => constructErrorClassSpecificErrorMessage(props, "IllegalAccessError", "Puuttuvat käyttöoikeudet."),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "NotFoundError"),
    errorMessage: (props) => constructErrorClassSpecificErrorMessage(props, "NotFoundError", props.t("error:eiloydy")),
  },
  {
    validator: ({ errorResponse }) => matchErrorClass(errorResponse, "NotActiveError"),
    errorMessage: (props) => constructErrorClassSpecificErrorMessage(props, "NotActiveError", props.t("error:epaaktiivinen")),
  },
];

export const generateErrorMessage: GenerateErrorMessage = (props) => {
  const matchingErrorMessages = nonGenericErrorMessages.filter((item) => item.validator(props));
  let errorMessage = "";
  if (matchingErrorMessages.length === 0) {
    errorMessage = generateGenericErrorMessage(props);
  } else {
    matchingErrorMessages.map((item) => item.errorMessage(props)).forEach((message) => (errorMessage += message));
  }

  // Ei näytetä korrelaatio IDeita kansalaisille
  if (showErrorDetails(props)) {
    errorMessage = concatCorrelationIdToErrorMessage(errorMessage, props.errorResponse.response?.errors);
  }
  return errorMessage;
};

const generateGenericErrorMessage: GenerateErrorMessage = ({ errorResponse, isYllapito, t }) => {
  const operationName = errorResponse.operation.operationName;
  return isYllapito ? `Odottamaton virhe toiminnossa '${operationName}'.` : t("error:yleinen");
};

function extractErrorInfo(e: GraphQLFormattedError): ErrorInfo {
  return {
    errorClassName: (e as any).errorInfo?.errorSubType,
    errorMessage: e.message,
  };
}

const getErrorInfoWithErrorClass = (errorResponse: ErrorResponse, searchString: string): ErrorInfo | undefined => {
  const errorInfos = errorResponse.graphQLErrors?.map((e) => extractErrorInfo(e));
  return errorInfos?.find((e: ErrorInfo) => e.errorClassName === searchString);
};

const matchErrorClass = (errorResponse: ErrorResponse, searchString: string): boolean => {
  const errorInfo = getErrorInfoWithErrorClass(errorResponse, searchString);
  return !!errorInfo;
};

const constructErrorClassSpecificErrorMessage = (props: GenerateErrorMessageProps, errorClassName: string, message: string): string => {
  const errorInfo = getErrorInfoWithErrorClass(props.errorResponse, errorClassName);
  let errorMessage = "";
  if (errorInfo) {
    errorMessage = message;
    // Ei näytetä yksityiskohtia kansalaisille
    if (showErrorDetails(props)) {
      errorMessage += " " + errorInfo.errorMessage + ".";
    }
  }
  return errorMessage;
};
