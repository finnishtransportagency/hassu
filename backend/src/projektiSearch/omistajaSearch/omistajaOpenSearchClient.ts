import OpenSearchClient from "../openSearchClient";
import { openSearchConfig } from "../openSearchConfig";

class OmistajaOpenSearchClient extends OpenSearchClient {
  constructor() {
    super(openSearchConfig.opensearchKiinteistonomistajaIndex);
  }
}

const omistajaOpenSearchClient = new OmistajaOpenSearchClient();
export default omistajaOpenSearchClient;
