import { ProjektiListaus } from "@components/projektiListaus";
import Button from "@components/button/Button";

function listingPage() {
  return (
    <section>
      <Button primary link={{ href: "/yllapito/perusta" }}>
        Perusta uusi projekti
      </Button>
      <h2 className="mt-4">Projektit</h2>
      <ProjektiListaus admin />
    </section>
  );
}

export default listingPage;
