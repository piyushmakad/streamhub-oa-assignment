@api @titles
Feature: Catalogue API - search, filter, sort and paginate titles
  As a client of the Streamhub Catalogue API
  I want to query titles with filters, sorting and pagination
  So that I can build browse and search experiences

  Scenario: Default listing returns the first page sorted by id
    When I request the titles
    Then the response status should be 200
    And the response should match the "title list" schema
    And the pagination meta should be:
      | page | limit | total | totalPages | sort | order |
      | 1    | 10    | 25    | 3          | id   | asc   |
    And 10 titles should be returned
    And the returned titles should be sorted by "id" in "asc" order

  Scenario Outline: Filter by <param>=<value>
    When I request the titles with:
      | param   | value   |
      | <param> | <value> |
      | limit   | 50      |
    Then the response status should be 200
    And the response should match the "title list" schema
    And the total should be <total>
    And every returned title should satisfy "<field>" <operator> "<expected>"

    Examples:
      | param     | value | field       | operator    | expected | total |
      | type      | movie | type        | equals      | movie    | 13    |
      | type      | SERIES| type        | equals      | series   | 12    |
      | genre     | Drama | genre       | equals      | Drama    | 4     |
      | genre     | drama | genre       | equals      | Drama    | 4     |
      | language  | Hindi | language    | equals      | Hindi    | 4     |
      | minRating | 8     | rating      | at least    | 8        | 9     |
      | minRating | 0     | rating      | at least    | 0        | 25    |
      | minRating | 10    | rating      | at least    | 10       | 0     |
      | q         | the   | title       | contains    | the      | 3     |
      | q         | LIGHT | title       | contains    | light    | 2     |
      | yearFrom  | 2023  | releaseYear | at least    | 2023     | 6     |
      | yearTo    | 2016  | releaseYear | at most     | 2016     | 3     |

  Scenario: Year range filter is inclusive on both ends
    When I request the titles with:
      | param    | value |
      | yearFrom | 2020  |
      | yearTo   | 2022  |
      | limit    | 50    |
    Then the response status should be 200
    And the total should be 10
    And every returned title should satisfy "releaseYear" at least "2020"
    And every returned title should satisfy "releaseYear" at most "2022"

  Scenario Outline: Sort by <sort> in <order> order
    When I request the titles with:
      | param | value   |
      | sort  | <sort>  |
      | order | <order> |
      | limit | 50      |
    Then the response status should be 200
    And the response should match the "title list" schema
    And 25 titles should be returned
    And the returned titles should be sorted by "<sort>" in "<order>" order

    Examples:
      | sort        | order |
      | title       | asc   |
      | title       | desc  |
      | rating      | asc   |
      | rating      | desc  |
      | releaseYear | asc   |
      | releaseYear | desc  |
      | id          | desc  |

  Scenario: Filters, sorting and pagination combine
    When I request the titles with:
      | param     | value  |
      | type      | series |
      | genre     | Drama  |
      | minRating | 8      |
      | sort      | rating |
      | order     | desc   |
    Then the response status should be 200
    And the returned title ids should be "11,20"

  Scenario: Combined filters with ascending year sort break ties by id
    When I request the titles with:
      | param    | value       |
      | language | English     |
      | type     | movie       |
      | yearFrom | 2019        |
      | sort     | releaseYear |
    Then the response status should be 200
    And the returned title ids should be "1,22,6,9,24"

  Scenario Outline: Pagination - page <page> with limit <limit>
    When I request the titles with:
      | param | value   |
      | page  | <page>  |
      | limit | <limit> |
    Then the response status should be 200
    And the response should match the "title list" schema
    And <count> titles should be returned
    And the pagination meta should be:
      | page   | limit   | total | totalPages   | sort | order |
      | <page> | <limit> | 25    | <totalPages> | id   | asc   |

    Examples:
      | page | limit | count | totalPages |
      | 1    | 1     | 1     | 25         |
      | 3    | 10    | 5     | 3          |
      | 1    | 50    | 25    | 1          |
      | 4    | 10    | 0     | 3          |
      | 9999 | 50    | 0     | 1          |

  Scenario: Paging through the whole catalogue returns every title exactly once
    When I page through all titles 7 at a time sorted by "rating" in "desc" order
    Then every title in the catalogue should have been returned exactly once

  Scenario Outline: Unusual but valid search input is handled safely (<description>)
    When I request the titles with:
      | param | value  |
      | q     | <term> |
    Then the response status should be 200
    And the response should match the "title list" schema
    And the total should be 0

    Examples:
      | description         | term                          |
      | HTML / script tags  | <script>alert(1)</script>     |
      | SQL injection       | ' OR 1=1 --                   |
      | unicode and emoji   | Ünïcödé 🎬                    |
      | regex metacharacters| .*+?^${}()\|[]                |
