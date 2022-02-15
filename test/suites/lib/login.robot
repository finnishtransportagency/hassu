*** Settings ***
Resource  ../lib/setup.robot

*** Keywords ***
Kirjaudu yllapitoon kayttajana ${username}
    IF  "${LOCAL_SERVER}"=="true"
      ${URL}        Set Variable    ${SERVER}/yllapito?x-hassudev-uid=${${username}_USERNAME}&x-hassudev-roles=${${username}_ROLES}
      Log   "Avaa selain ${URL}"
      GoTo      ${URL}
    ELSE
      ${URL}        Set Variable    ${SERVER}/yllapito/kirjaudu
      GoTo          ${URL}
      Input Text    id=username   text=${${username}_USERNAME}
      Input Text    id=password   text=${${username}_PASSWORD}
      Click Button  css=.submit
    END
    Wait Until Element Is Visible    xpath=//a[@href='/yllapito/perusta']
