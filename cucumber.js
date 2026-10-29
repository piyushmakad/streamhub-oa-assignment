// Cucumber profiles. Each suite writes its own HTML / JSON / JUnit report under reports/<suite>/.
const common = {
  requireModule: ['ts-node/register'],
  require: ['tests/support/**/*.ts', 'tests/step-definitions/**/*.ts'],
  formatOptions: { snippetInterface: 'async-await' },
};

const reportsFor = (suite) => [
  'progress',
  `summary:reports/${suite}/summary.txt`,
  `html:reports/${suite}/cucumber-report.html`,
  `json:reports/${suite}/cucumber-report.json`,
  `junit:reports/${suite}/junit.xml`,
];

module.exports = {
  default: {
    ...common,
    paths: ['tests/features/**/*.feature'],
    tags: 'not @broken-locators',
    format: reportsFor('all'),
  },
  api: {
    ...common,
    paths: ['tests/features/api/**/*.feature'],
    format: reportsFor('api'),
  },
  ui: {
    ...common,
    paths: ['tests/features/ui/**/*.feature'],
    tags: 'not @broken-locators',
    // The UI suite targets a live third-party site, so one retry absorbs network blips.
    retry: 1,
    format: reportsFor('ui'),
  },
  sql: {
    ...common,
    paths: ['tests/features/sql/**/*.feature'],
    format: reportsFor('sql'),
  },
  broken: {
    ...common,
    paths: ['tests/features/ui/**/*.feature'],
    tags: '@broken-locators',
    format: reportsFor(process.env.SELF_HEAL === 'true' ? 'self-healing/healed-run' : 'self-healing/broken-run'),
  },
};
