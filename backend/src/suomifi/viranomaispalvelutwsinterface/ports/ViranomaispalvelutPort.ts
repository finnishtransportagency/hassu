import { HaeAsiakkaita } from "../definitions/HaeAsiakkaita";
import { HaeAsiakkaitaResponse } from "../definitions/HaeAsiakkaitaResponse";
import { LisaaKohteita } from "../definitions/LisaaKohteita";
import { LisaaKohteitaResponse } from "../definitions/LisaaKohteitaResponse";
import { HaeTilaTieto } from "../definitions/HaeTilaTieto";
import { HaeTilaTietoResponse } from "../definitions/HaeTilaTietoResponse";
import { LahetaViesti } from "../definitions/LahetaViesti";
import { LahetaViestiResponse } from "../definitions/LahetaViestiResponse";

export interface ViranomaispalvelutPort {
    HaeAsiakkaita(haeAsiakkaita: HaeAsiakkaita, callback: (err: any, result: HaeAsiakkaitaResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    LisaaKohteita(lisaaKohteita: LisaaKohteita, callback: (err: any, result: LisaaKohteitaResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    HaeTilaTieto(haeTilaTieto: HaeTilaTieto, callback: (err: any, result: HaeTilaTietoResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    LahetaViesti(lahetaViesti: LahetaViesti, callback: (err: any, result: LahetaViestiResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
}
