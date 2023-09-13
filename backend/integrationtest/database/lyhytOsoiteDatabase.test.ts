import { describe } from "mocha";
import { setupLocalDatabase } from "../util/databaseUtil";
import { lyhytOsoiteDatabase } from "../../src/database/lyhytOsoiteDatabase";

import { expect } from "chai";

describe("LyhytOsoiteDatabase", () => {
  setupLocalDatabase();

  it("should manage lyhytosoitteet successfully", async () => {
    await lyhytOsoiteDatabase.deleteLyhytOsoite("test");
    await lyhytOsoiteDatabase.deleteLyhytOsoite("test2");
    // Luodaan uusi
    await expect(lyhytOsoiteDatabase.setLyhytOsoite("test", "1")).to.eventually.eq(true);
    await expect(lyhytOsoiteDatabase.getLyhytOsoite("1")).to.eventually.eq("test");

    // Yritetään tallentaa olemassa olevan päälle
    await expect(lyhytOsoiteDatabase.setLyhytOsoite("test", "2")).to.eventually.eq(false);

    // Varmistetaan ettei ole muuttunut
    await expect(lyhytOsoiteDatabase.getLyhytOsoite("1")).to.eventually.eq("test");
    await expect(lyhytOsoiteDatabase.getLyhytOsoite("2")).to.eventually.eq(undefined);

    // Yritetään luoda uusi lyhytosoite olemassa olevalle projektille, jolloin palautuu olemassa oleva lyhytosoite eikä uutta generoida
    await expect(lyhytOsoiteDatabase.generateAndSetLyhytOsoite("1")).to.eventually.eq("test");
  });
});
