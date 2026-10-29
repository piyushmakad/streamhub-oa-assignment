@api @titles
Feature: Catalogue API - fetch a single title

  Scenario: Fetch an existing title
    When I request the title with id "13"
    Then the response status should be 200
    And the response should match the "single title" schema
    And the returned title should have id 13 and title "Wild Coasts"

  Scenario Outline: Boundary ids that exist (<id>)
    When I request the title with id "<id>"
    Then the response status should be 200
    And the response should match the "single title" schema

    Examples:
      | id |
      | 1  |
      | 25 |

  Scenario Outline: Unknown id <id> returns 404
    When I request the title with id "<id>"
    Then the response status should be 404
    And the response should match the "error" schema
    And the error code should be "NOT_FOUND"

    Examples:
      | id         |
      | 26         |
      | 999999     |

  Scenario Outline: Malformed id <id> returns 400
    When I request the title with id "<id>"
    Then the response status should be 400
    And the response should match the "error" schema
    And the error code should be "VALIDATION_ERROR"
    And the error details should name the parameters "id"

    Examples:
      | id   |
      | abc  |
      | 0    |
      | -5   |
      | 1.5  |
      | 1e3  |

  Scenario: Query parameters are not accepted on the single-title endpoint
    When I request the title with id "1" and query "fields=title"
    Then the response status should be 400
    And the error details should name the parameters "fields"
