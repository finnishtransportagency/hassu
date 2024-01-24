import { Client as SoapClient, createClientAsync as soapCreateClientAsync } from "soap";
import { HaeAsiakkaita } from "./definitions/HaeAsiakkaita";
import { HaeAsiakkaitaResponse } from "./definitions/HaeAsiakkaitaResponse";
import { LisaaKohteita } from "./definitions/LisaaKohteita";
import { LisaaKohteitaResponse } from "./definitions/LisaaKohteitaResponse";
import { HaeTilaTieto } from "./definitions/HaeTilaTieto";
import { HaeTilaTietoResponse } from "./definitions/HaeTilaTietoResponse";
import { LahetaViesti } from "./definitions/LahetaViesti";
import { LahetaViestiResponse } from "./definitions/LahetaViestiResponse";
import { ViranomaispalvelutService } from "./services/ViranomaispalvelutService";

export interface ViranomaispalvelutWsInterfaceClient extends SoapClient {
    ViranomaispalvelutService: ViranomaispalvelutService;
    HaeAsiakkaitaAsync(haeAsiakkaita: HaeAsiakkaita): Promise<[result: HaeAsiakkaitaResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    LisaaKohteitaAsync(lisaaKohteita: LisaaKohteita): Promise<[result: LisaaKohteitaResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    HaeTilaTietoAsync(haeTilaTieto: HaeTilaTieto): Promise<[result: HaeTilaTietoResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    LahetaViestiAsync(lahetaViesti: LahetaViesti): Promise<[result: LahetaViestiResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
}

/** Create ViranomaispalvelutWsInterfaceClient */
export function createClientAsync(...args: Parameters<typeof soapCreateClientAsync>): Promise<ViranomaispalvelutWsInterfaceClient> {
    return soapCreateClientAsync(args[0], args[1], args[2]) as any;
}
