*** Settings ***
Resource  ../lib/setup.robot

Suite Setup       Avaa selain

Test Teardown     Run Keyword If Test Failed    Capture Page Screenshot

Suite Teardown        Sulje selain

*** Variables ***

*** Test Cases ***
Avaa kansalaisen etusivu
    Selain on avattu kansalaisen etusivulle
    Sivun otsikon pitäisi olla Hassu

*** Keywords ***
Sivun otsikon pitäisi olla ${expected_title}
  ${title}=         Get Title
  Should Be Equal   ${expected_title}    ${title}
