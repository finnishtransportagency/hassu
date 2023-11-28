import OpenSearchClient from "./openSearchClient";
import { openSearchConfig } from "./openSearchConfig";

class OpenSearchClientYllapito extends OpenSearchClient {
  constructor() {
    super(openSearchConfig.opensearchYllapitoIndex);
  }
}

const openSearchClientYllapito = new OpenSearchClientYllapito();
export default openSearchClientYllapito;
