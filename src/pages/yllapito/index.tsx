import { ProjektiListaus } from "@components/projektiListaus";
import ButtonLink from "@components/button/ButtonLink";

function listingPage() {
  return (
    <section>
      <ButtonLink primary href="/yllapito/perusta">
        Perusta uusi projekti
      </ButtonLink>
      <h2 className="mt-4">Projektit</h2>
      <ProjektiListaus admin />
    </section>
  );
}

export default listingPage;
