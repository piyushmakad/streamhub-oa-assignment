@api @genres
Feature: Catalogue API - genres, health and routing

  Scenario: Health check
    When I call the health endpoint
    Then the response status should be 200
    And the response should match the "health" schema

  Scenario: Genres are listed alphabetically by default
    When I request the genres
    Then the response status should be 200
    And the response should match the "genre list" schema
    And the genres should be sorted by "name" in "asc" order

  Scenario Outline: Sort genres by <sort> in <order> order
    When I request the genres with:
      | param | value   |
      | sort  | <sort>  |
      | order | <order> |
    Then the response status should be 200
    And the response should match the "genre list" schema
    And the genres should be sorted by "<sort>" in "<order>" order

    Examples:
      | sort  | order |
      | name  | desc  |
      | count | asc   |
      | count | desc  |

  Scenario: Genre counts are consistent with the titles endpoint
    When I request the genres
    Then each genre count should equal the titles total for that genre
    And the genre counts should add up to the total number of titles

  Scenario Outline: Invalid genre parameters are rejected (<param>=<value>)
    When I request the genres with:
      | param   | value   |
      | <param> | <value> |
    Then the response status should be 400
    And the response should match the "error" schema
    And the error details should name the parameters "<param>"

    Examples:
      | param | value      |
      | sort  | popularity |
      | order | up         |
      | limit | 5          |

  Scenario: Unknown routes return a structured 404
    When I send a GET request to "/api/directors"
    Then the response status should be 404
    And the response should match the "error" schema
    And the error code should be "NOT_FOUND"
