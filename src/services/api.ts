import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();
const apiImpl = publicRuntimeConfig.apiImpl;
export const api = require("./api/" + apiImpl).api;

export { apiConfig } from "../../common/abstractApi";
export * from "../../common/graphql/apiModel";
