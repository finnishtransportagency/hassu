/* tslint:disable */
/* eslint-disable */
/**
 * Aineistopalvelu API v1
 * Aineistopalvelu API v1  Palvelu vastaa seuraavista kohdeluokista:  - Aineisto (tekninen nimi: aineisto/aineisto, oid-prefix: 1.2.246.578.5.100)  - Dokumentti (tekninen nimi: aineisto/dokumentti, oid-prefix: 1.2.246.578.5.199)  - Ladattava paketti (tekninen nimi: aineisto/ladattava-paketti, oid-prefix: 1.2.246.578.5.102)  - Pakattu kansio (tekninen nimi: aineisto/pakattu-kansio, oid-prefix: 1.2.246.578.5.101)  - Viittaus (tekninen nimi: aineisto/viittaus, oid-prefix: 1.2.246.578.5.103)
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import { Configuration } from "./configuration";
// Some imports not used depending on template conditions
// @ts-ignore
import globalAxios, { AxiosPromise, AxiosInstance, AxiosRequestConfig } from 'axios';

export const BASE_PATH = "http://localhost".replace(/\/+$/, "");

/**
 *
 * @export
 */
export const COLLECTION_FORMATS = {
    csv: ",",
    ssv: " ",
    tsv: "\t",
    pipes: "|",
};

/**
 *
 * @export
 * @interface RequestArgs
 */
export interface RequestArgs {
    url: string;
    options: AxiosRequestConfig;
}

/**
 *
 * @export
 * @class BaseAPI
 */
export class BaseAPI {
    protected configuration: Configuration | undefined;

    constructor(configuration?: Configuration, protected basePath: string = BASE_PATH, protected axios: AxiosInstance = globalAxios) {
        if (configuration) {
            this.configuration = configuration;
            this.basePath = configuration.basePath || this.basePath;
        }
    }
};

/**
 *
 * @export
 * @class RequiredError
 * @extends {Error}
 */
export class RequiredError extends Error {
    name: "RequiredError" = "RequiredError";
    constructor(public field: string, msg?: string) {
        super(msg);
    }
}