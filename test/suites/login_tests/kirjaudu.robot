*** Settings ***
Resource  ../lib/setup.robot
Resource  ../lib/login.robot

Suite Setup       Avaa selain

Test Teardown     Run Keyword If Test Failed    Capture Page Screenshot

Suite Teardown    Sulje selain

*** Variables ***

*** Test Cases ***
Kirjaudu yllapitoon
    Kirjaudu yllapitoon kayttajana A1
