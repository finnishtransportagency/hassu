import getConfig from "next/config";
import { AbstractApi } from "../../common/abstractApi";

const { publicRuntimeConfig } = getConfig();
const apiImpl = publicRuntimeConfig.apiImpl;
export const api: AbstractApi = require("./api/" + apiImpl).api;

export { apiConfig } from "../../common/abstractApi";
export * from "../../common/graphql/apiModel";
