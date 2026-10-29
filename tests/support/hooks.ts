import fs from 'fs';
import path from 'path';
import { Server } from 'http';
import { After, AfterAll, Before, BeforeAll, ITestCaseHookParameter, Status } from '@cucumber/cucumber';
import { Browser, chromium, firefox, request, webkit } from 'playwright';
import { config } from './config';
import { CustomWorld } from './world';
import { CatalogueApiClient } from '../api/CatalogueApiClient';
import { EmiCalculatorPage } from '../pages/EmiCalculatorPage';
import { startServer } from '../../api/src/server';

// Third-party ad / tracking hosts on emicalculator.net. Their iframes can overlay the calculator
// and intercept clicks, so they are aborted at the network layer.
const BLOCKED_HOSTS = /googlesyndication|doubleclick|googletagservices|googletagmanager|google-analytics|adservice|fundingchoices|amazon-adsystem|adnxs|taboola|outbrain/;

let browser: Browser | undefined;
let apiServer: Server | undefined;

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 90);

BeforeAll(async function () {
  console.log(`\n▶ TEST_ENV=${config.envName}  API=${config.api.baseUrl}  EMI=${config.emi.baseUrl}  SELF_HEAL=${config.selfHealing.enabled}\n`);
});

// ---------- API ----------
Before({ tags: '@api' }, async function (this: CustomWorld) {
  if (config.api.startInProcess && !apiServer) {
    apiServer = await startServer(config.api.port);
  }
  this.request = await request.newContext({ baseURL: config.api.baseUrl, extraHTTPHeaders: { Accept: 'application/json' } });
  this.api = new CatalogueApiClient(this.request);
});

After({ tags: '@api' }, async function (this: CustomWorld, { result }: ITestCaseHookParameter) {
  if (result?.status === Status.FAILED && this.response) {
    this.attach(
      JSON.stringify({ url: this.response.url(), status: this.response.status(), body: this.responseBody }, null, 2),
      'application/json',
    );
  }
  await this.request?.dispose();
});

// ---------- UI ----------
Before({ tags: '@ui' }, async function (this: CustomWorld, { pickle }: ITestCaseHookParameter) {
  if (!browser) {
    const engine = { chromium, firefox, webkit }[config.browser.name];
    browser = await engine.launch({ headless: config.browser.headless });
  }
  this.context = await browser.newContext({ viewport: config.browser.viewport, locale: 'en-IN' });
  await this.context.tracing.start({ screenshots: true, snapshots: true, title: pickle.name });
  if (config.browser.blockAds) {
    await this.context.route(BLOCKED_HOSTS, (route) => route.abort());
  }
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(config.browser.defaultTimeoutMs);
  this.page.setDefaultNavigationTimeout(config.browser.navigationTimeoutMs);
  this.emiPage = new EmiCalculatorPage(this.page);
});

After({ tags: '@ui' }, async function (this: CustomWorld, { pickle, result }: ITestCaseHookParameter) {
  const failed = result?.status === Status.FAILED;
  const name = `${slug(pickle.name)}${failed ? '-FAILED' : ''}`;
  const suite = process.env.SELF_HEAL === 'true' ? 'self-healing/healed-run' : pickle.tags.some((t) => t.name === '@broken-locators') ? 'self-healing/broken-run' : 'ui';

  if (this.page) {
    // Evidence for every UI scenario, pass or fail: a full-page screenshot in the report and on disk.
    const dir = path.join(config.paths.reports, suite, 'screenshots');
    fs.mkdirSync(dir, { recursive: true });
    const png = await this.page.screenshot({ fullPage: false, path: path.join(dir, `${name}.png`) });
    this.attach(png, 'image/png');
  }
  if (this.context) {
    // Traces are only kept for failures (they are large); open with `npx playwright show-trace <zip>`.
    const tracePath = failed ? path.join(config.paths.reports, suite, 'traces', `${name}.zip`) : undefined;
    await this.context.tracing.stop(tracePath ? { path: tracePath } : undefined);
    await this.context.close();
  }
});

AfterAll(async function () {
  await browser?.close();
  if (apiServer) await new Promise<void>((resolve) => apiServer!.close(() => resolve()));
});
