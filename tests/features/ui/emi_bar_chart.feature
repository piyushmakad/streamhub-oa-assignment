@ui @emi @bar-chart
Feature: Test Case 2 - Validate the EMI bar chart (Personal Loan)
  As a personal-loan borrower
  I want the yearly payment chart to reflect my loan and chosen start month
  So that I can see how much principal and interest I pay each year

  Background:
    Given I launch the EMI calculator
    When I navigate to the "Personal Loan" tab
    And I use the sliders to set a loan amount of "10L", an interest rate of 12% and a tenure of 5 years
    Then the displayed EMI should match my independently calculated EMI

  # A 5-year loan covers 5 calendar years if it starts in January and 6 if it starts mid-year,
  # so the expected bar count depends on the start month chosen in the calendar widget.
  Scenario Outline: Bar chart for a loan starting <start> - <bars> bars, tooltip for the <series> bar of <year>
    When I change the schedule start month to "<start>" using the calendar widget
    Then the bar chart should be visible and available
    And the bar chart should show the calendar years "<years>"
    And the bar chart should contain <bars> bars in total
    And each calendar year should have one Principal bar and one Interest bar
    When I hover over the "<series>" bar for <year>
    Then the tooltip should show the year <year>
    And the tooltip's <series> and Total Payment values should match my amortisation schedule

    Examples:
      | start    | years                        | bars | series    | year |
      | Jan 2027 | 2027,2028,2029,2030,2031      | 10   | Principal | 2028 |
      | Jul 2027 | 2027,2028,2029,2030,2031,2032 | 12   | Interest  | 2027 |
