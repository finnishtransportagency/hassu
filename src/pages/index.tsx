import { ProjektiTyyppi } from "@services/api";
import { ProjektiListaus } from "../components/projektiListaus";

const App = () => {
  // const [refreshListCounter, setRefreshListCounter] = useState(0)

  return (
    <>
      <h2 className="mt-4">Tiesuunnitelmat</h2>
      <ProjektiListaus admin projektiTyyppi={ProjektiTyyppi.TIE} />
      <h2 className="mt-4">Ratasuunnitelmat</h2>
      <ProjektiListaus admin projektiTyyppi={ProjektiTyyppi.RATA} />
      <h2 className="mt-4">Yleissuunnitelmat</h2>
      <ProjektiListaus admin projektiTyyppi={ProjektiTyyppi.YLEINEN} />
    </>
  );
};

export default App;
