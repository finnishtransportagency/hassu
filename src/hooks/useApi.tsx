import { useContext } from "react";
import { ApiContext } from "@components/ApiProvider";

const useApi = () => useContext(ApiContext);

export default useApi;
