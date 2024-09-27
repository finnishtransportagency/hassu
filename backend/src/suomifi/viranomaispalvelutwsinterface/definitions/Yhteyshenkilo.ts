export type YhteyshenkiloAttributes = {
    Nimi?: string;
    Sahkoposti: string;
    Matkapuhelin?: string;
};

/**
 * Yhteyshenkilo
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Yhteyshenkilo {
    attributes: YhteyshenkiloAttributes;
}
