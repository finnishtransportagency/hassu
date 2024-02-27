import OpenSearchClient from "../openSearchClient";
import { openSearchConfig } from "../openSearchConfig";

class MuistuttajaOpenSearchClient extends OpenSearchClient {
  constructor() {
    super(openSearchConfig.opensearchMuistuttajaIndex);
  }
}

const muistuttajaOpenSearchClient = new MuistuttajaOpenSearchClient();
export default muistuttajaOpenSearchClient;
