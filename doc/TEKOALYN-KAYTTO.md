# Tekoälyn käyttö -dokumentaatio

Tämä dokumentti kuvaa tekoälyn hyödyntämisen projektissa Väyläviraston
[vaatimusten](https://extranet.vayla.fi/share/page/site/tj-th/document-details?nodeRef=workspace://SpacesStore/d7835e78-3d06-49f2-811d-22d9bfdc822a) mukaisesti.

## Tekoälyn käyttötapa

- **Työkalu:** Amazon Q Developer -laajennus VS Codessa, Claude Sonnet 4.6 (Anthropic).
- **Tehtävä & rooli:** Koodin generointi ja sparrausapu – tekoäly tuottaa ehdotuksia, ihminen ohjaa, arvioi ja päättää mitä ehdotuksista käytetään.
- **Ihmisen tarkistus:** Kehittäjän tarkistus ja lokaali testaus ennen commitia sekä koodikatselmointi PR-vaiheessa.

## Tietolähteet ja tietoluokitus

- Projektin lähdekoodi – Luokitus: julkinen

## Jäljitettävyys

Tekoälyn käyttö on jäljitettävissä seuraavasti:

- **Koodikommentit:** Tiedostot, jotka sisältävät tekoälyn tuottamaa tai suosittelemaa koodia merkitään kommentilla "Contains code generated or recommended by Amazon Q".

## Ihmisen tarkistus

- **Koodikatselmointi (PR):** Jokainen PR katselmoidaan vähintään yhden kehittäjän toimesta ennen yhdistämistä.
- **Automaattiset testit:** CI/CD-putki ajaa yksikkö- ja integraatiotestit.
- **Manuaalinen testaus:** Toiminnallisuus testataan aina myös manuaalisesti.

## Rajoitteet ja poikkeamat

N/A
