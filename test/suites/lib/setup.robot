*** Settings ***
Library     SeleniumLibrary   timeout=10   implicit_wait=1.5   run_on_failure=Capture Page Screenshot
Library     XvfbRobot

Variables     ../../../robotenv.py

*** Variables ***

${TMP_PATH}       /tmp

*** Keywords ***
Avaa selain
    Run Keyword If  "%{ROBOT_SELENIUM_SPEED=}"!=""       Set Selenium Speed        %{ROBOT_SELENIUM_SPEED}
    Run Keyword If  "%{ROBOT_OPEN_BROWSER=}"!="true"     Start Virtual Display     1920    1080
    ${options}  Evaluate  sys.modules['selenium.webdriver'].ChromeOptions()  sys, selenium.webdriver
    Call Method  ${options}  add_argument  --no-sandbox
    ${prefs}    Create Dictionary    download.default_directory=${TMP_PATH}
    Call Method    ${options}    add_experimental_option    prefs    ${prefs}
    Create Webdriver    Chrome    chrome_options=${options}

Sulje selain
    Run Keyword If All Tests Passed    Close All Browsers if running headless

Close All Browsers if running headless
    Run Keyword If  "%{ROBOT_OPEN_BROWSER=}"!="true"     Close All Browsers

Selain on avattu kansalaisen etusivulle
    Log   "Avaa selain ${SERVER}"
    GoTo  ${SERVER}
