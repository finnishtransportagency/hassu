# Tekoälyn käyttö -dokumentaatio

Tämä dokumentti kuvaa tekoälyn hyödyntämisen projektissa Väyläviraston
[vaatimusten](https://extranet.vayla.fi/share/page/site/tj-th/document-details?nodeRef=workspace://SpacesStore/d7835e78-3d06-49f2-811d-22d9bfdc822a) mukaisesti.

## Tekoälyn käyttötapa

- **Työkalu:** Amazon Q Developer -laajennus VS Codessa, Claude Sonnet 4.6 (Anthropic)
- **Tehtävä & rooli:** Koodin generointi – tekoäly tuottaa ehdotuksia, ihminen ohjaa ja muokkaa
- **Ihmisen tarkistus:** Kehittäjän tarkistus ennen commitia ja koodikatselmointi PR:ssä

## Tietolähteet ja tietoluokitus

- Projektin lähdekoodi – Luokitus: julkinen

## Jäljitettävyys

Tekoälyn käyttö on jäljitettävissä seuraavasti:

- **Koodikommentit:** Kokonaan tai merkittäviltä osin tekoälyn tuottamat tiedostot merkitään kommentilla.

## Ihmisen tarkistus

- **Koodikatselmointi (PR):** Jokainen PR katselmoidaan vähintään yhden kehittäjän toimesta ennen yhdistämistä.
- **Automaattiset testit:** CI/CD-putki ajaa yksikkö- ja integraatiotestit.
- **Manuaalinen testaus:** Toiminnallisuus testataan aina myös manuaalisesti.

## Rajoitteet ja poikkeamat

N/A
