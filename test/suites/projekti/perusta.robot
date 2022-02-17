*** Settings ***
Resource  ../lib/setup.robot
Resource  ../lib/login.robot

Suite Setup       Avaa selain

Test Teardown     Ota ruutukaappaus jos tapahtui virhe

Suite Teardown    Sulje selain

*** Test Cases ***
Perusta projekti
    Kirjaudu yllapitoon kayttajana A1
    Perusta projekti HASSU AUTOMAATTITESTIPROJEKTI1

*** Keywords ***
Perusta projekti ${projekti_nimi}
    Click Element                     xpath://a[@href="/yllapito/perusta"]

    Wait Until Element Is Visible     name:name
    Input Text                        name:name                               ${projekti_nimi}

    Click Button                      hae

    Wait Until Element Is Visible     xpath://td[text()="${projekti_nimi}"]
    Run Keyword And Ignore Error      Scroll Element Into View                xpath://td[text()="${projekti_nimi}"]
    Click Element                     xpath://td[text()="${projekti_nimi}"]

    Wait Until Location Contains      /perusta/
    ${OID}=                           Execute Javascript    return window.location.href.replace(/.*\\//, "")

    Wait Until Element Is Enabled     name:kayttoOikeudet.0.puhelinnumero
    Input Text                        name:kayttoOikeudet.0.puhelinnumero     0291111111

    Run Keyword And Ignore Error      Scroll Element Into View                xpath://div[text()="Tallenna ja siirry projektiin"]
    Click Element                     xpath://div[text()="Tallenna ja siirry projektiin"]
    Wait Until Element Is Visible     xpath://h2[text()="${projekti_nimi}"]
    Wait Until Element Is Enabled     xpath://textarea[@name="muistiinpano"]

    [Teardown]                        Arkistoi projekti ${OID}
