import { ProjektiListaus } from "@components/projektiListaus";
import Button from "@components/button/Button";

function listingPage() {
  return (
    <section>
      <Button primary={true} link={{ href: "/yllapito/perusta" }}>
        Perusta uusi projekti
      </Button>
      <h2 className="mt-4">Projektit</h2>
      <ProjektiListaus admin={true} />
    </section>
  );
}

export default listingPage;
