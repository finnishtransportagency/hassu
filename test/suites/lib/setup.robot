*** Settings ***
Library     SeleniumLibrary   timeout=10   implicit_wait=1.5   run_on_failure=Capture Page Screenshot
Library     XvfbRobot

Variables     ../../../robotenv.py

*** Variables ***

${TMP_PATH}       /tmp

*** Keywords ***
Avaa selain
    Start Virtual Display    1920    1080
    ${options}  Evaluate  sys.modules['selenium.webdriver'].ChromeOptions()  sys, selenium.webdriver
    Call Method  ${options}  add_argument  --no-sandbox
    ${prefs}    Create Dictionary    download.default_directory=${TMP_PATH}
    Call Method    ${options}    add_experimental_option    prefs    ${prefs}
    Create Webdriver    Chrome    chrome_options=${options}

Selain on avattu kansalaisen etusivulle
    GoTo  ${SERVER}
