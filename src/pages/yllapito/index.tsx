import { ProjektiListaus } from "@components/projektiListaus";
import ButtonLink from "@components/button/ButtonLink";
import { ProjektiTyyppi } from "@services/api";

function listingPage() {
  return (
    <section>
      <ButtonLink primary href="/yllapito/perusta">
        Perusta uusi projekti
      </ButtonLink>
      <h2 className="mt-4">Tiesuunnitelmat</h2>
      <ProjektiListaus admin projektiTyyppi={ProjektiTyyppi.TIE} />
      <h2 className="mt-4">Ratasuunnitelmat</h2>
      <ProjektiListaus admin projektiTyyppi={ProjektiTyyppi.RATA} />
      <h2 className="mt-4">Yleissuunnitelmat</h2>
      <ProjektiListaus admin projektiTyyppi={ProjektiTyyppi.YLEINEN} />
    </section>
  );
}

export default listingPage;
