@ui @broken-locators
Feature: AI self-healing exercise - deliberately broken locators
  These scenarios drive the "legacy" page object, whose five locators are intentionally broken.
  They are excluded from the normal UI run.
    npm run test:broken    -> SELF_HEAL=false: the locators fail, the failures are detected and logged
    npm run test:healing   -> SELF_HEAL=true:  the healer proposes, validates and uses replacements

  Scenario: Locator drift check - probe every legacy locator before any step uses it
    Given I launch the EMI calculator
    When I audit every locator in the legacy page object against the live page
    Then all 5 deliberately broken locators should be detected
    And each broken locator should be handled according to the self-healing mode

  Scenario: Personal loan EMI through the legacy page object (broken locators #1-#4)
    Given I launch the EMI calculator
    When I open the Personal Loan tab using the legacy page object
    And I type a loan amount of "10L" and an interest rate of 12% using the legacy page object
    And I set a tenure of 5 years using the resilient page object
    Then the EMI read through the legacy page object should match my independently calculated EMI

  Scenario: A hallucinated locator must not be "healed" onto a different element (broken locator #5)
    Given I launch the EMI calculator
    When I try to click the legacy "Calculate EMI" button
    Then the healer should refuse to substitute a different element
