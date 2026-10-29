@ui @emi @pie-chart
Feature: Test Case 1 - Validate the EMI pie chart (Home Loan)
  As a home-loan borrower
  I want the calculator's EMI and payment break-up to be correct
  So that I can trust the figures and the pie chart it shows me

  Background:
    Given I launch the EMI calculator
    When I navigate to the "Home Loan" tab

  Scenario Outline: <name> - EMI and pie chart for <amount> at <rate>% over <tenure> years
    When I enter a loan amount of "<amount>", an interest rate of <rate>% and a tenure of <tenure> years
    Then the displayed EMI should match my independently calculated EMI
    And the displayed total interest and total payment should match my calculation
    And the pie chart should be visible and available
    And the pie chart should have 2 sections: "Principal Loan Amount" and "Total Interest"
    And the numerical values of both pie chart sections should be greater than zero
    And the pie chart split should match my calculated principal and interest share

    Examples:
      | name       | amount | rate | tenure |
      | Scenario A | 25L    | 10   | 10     |
      | Scenario B | 50L    | 7.5  | 15     |
