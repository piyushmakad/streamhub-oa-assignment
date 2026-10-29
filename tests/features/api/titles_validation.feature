@api @titles @negative
Feature: Catalogue API - invalid and edge-case query parameters
  The API must reject bad input with 400 and a structured error body,
  never a 5xx, and never silently ignore a parameter it does not understand.

  Scenario Outline: Reject <param>=<value> (<reason>)
    When I request the titles with:
      | param   | value   |
      | <param> | <value> |
    Then the response status should be 400
    And the response should match the "error" schema
    And the error code should be "VALIDATION_ERROR"
    And the error details should name the parameters "<param>"

    Examples:
      | param     | value        | reason                     |
      | limit     | 0            | below minimum              |
      | limit     | 51           | above maximum              |
      | limit     | ten          | not a number               |
      | limit     | 10.5         | not an integer             |
      | page      | 0            | below minimum              |
      | page      | -1           | negative                   |
      | page      | 1e3          | scientific notation        |
      | minRating | 10.5         | above maximum              |
      | minRating | -0.1         | below minimum              |
      | minRating | high         | not a number               |
      | yearFrom  | 1899         | below minimum              |
      | yearTo    | 20x0         | not an integer             |
      | sort      | budget       | unsupported sort field     |
      | sort      | RATING       | sort field is case-exact   |
      | order     | sideways     | unsupported order          |
      | type      | podcast      | unsupported enum value     |
      | genre     | Horror       | genre not in catalogue     |
      | language  | Klingon      | language not in catalogue  |
      | q         | a            | search term too short      |
      | q         | <blank>      | blank after trimming       |
      | foo       | bar          | unknown parameter          |

  Scenario: Empty parameter value is rejected
    When I request the titles with:
      | param | value |
      | genre |       |
    Then the response status should be 400
    And the error details should name the parameters "genre"

  Scenario: Search term longer than 100 characters is rejected
    When I search titles with a term of 101 characters
    Then the response status should be 400
    And the error details should name the parameters "q"

  Scenario: Search term of exactly 100 characters is accepted
    When I search titles with a term of 100 characters
    Then the response status should be 200
    And the total should be 0

  Scenario: Repeating a parameter is rejected rather than silently picking one value
    When I request the titles with:
      | param | value  |
      | type  | movie  |
      | type  | series |
    Then the response status should be 400
    And the error details should name the parameters "type"

  Scenario: An inverted year range is rejected
    When I request the titles with:
      | param    | value |
      | yearFrom | 2023  |
      | yearTo   | 2020  |
    Then the response status should be 400
    And the error details should name the parameters "yearFrom"

  Scenario: All invalid parameters are reported together
    When I request the titles with:
      | param | value   |
      | limit | 0       |
      | sort  | budget  |
      | type  | podcast |
      | foo   | bar     |
    Then the response status should be 400
    And the response should match the "error" schema
    And the error details should name the parameters "foo,type,sort,limit"

  Scenario Outline: Boundary values that are valid are accepted (<param>=<value>)
    When I request the titles with:
      | param   | value   |
      | <param> | <value> |
    Then the response status should be 200
    And the response should match the "title list" schema

    Examples:
      | param     | value |
      | limit     | 1     |
      | limit     | 50    |
      | minRating | 0     |
      | minRating | 10    |
      | yearFrom  | 1900  |
      | yearTo    | 2100  |
      | q         | ab    |
