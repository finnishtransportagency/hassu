// Contains code generated or recommended by Amazon Q
import { generateErrorMessage } from "../../util/errorMessageUtil";
import { ErrorResponse } from "@apollo/client/link/error";
import { Operation } from "@apollo/client";

jest.mock("../../util/env", () => ({
  getPublicEnv: (key: string) => {
    if (key === "ENVIRONMENT") return "dev";
    return undefined;
  },
}));

const createMockErrorResponse = (operationName: string): ErrorResponse => ({
  operation: { operationName, variables: {} } as unknown as Operation,
  response: { errors: undefined },
  graphQLErrors: [],
  forward: jest.fn(),
});

const mockTranslate = ((key: string) => key) as any;

describe("generateErrorMessage", () => {
  it("should return generic translated message for kansalainen on NykyinenSuomifiKayttaja error", () => {
    const errorResponse = createMockErrorResponse("NykyinenSuomifiKayttaja");
    const message = generateErrorMessage({ errorResponse, isYllapito: false, t: mockTranslate });
    expect(message).toBe("error:yleinen");
  });

  it("should return specific message for LataaProjekti", () => {
    const errorResponse = createMockErrorResponse("LataaProjekti");
    const message = generateErrorMessage({ errorResponse, isYllapito: false, t: mockTranslate });
    expect(message).toBe("Projektin lataus epäonnistui.");
  });

  it("should return generic message with operation name for yllapito user on unknown operation", () => {
    const errorResponse = createMockErrorResponse("TuntematonOperaatio");
    const message = generateErrorMessage({ errorResponse, isYllapito: true, t: mockTranslate });
    expect(message).toContain("Odottamaton virhe toiminnossa 'TuntematonOperaatio'.");
  });

  it("should return translated generic message for kansalainen on unknown operation", () => {
    const errorResponse = createMockErrorResponse("TuntematonOperaatio");
    const message = generateErrorMessage({ errorResponse, isYllapito: false, t: mockTranslate });
    expect(message).toBe("error:yleinen");
  });
});
