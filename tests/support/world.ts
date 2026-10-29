import { IWorldOptions, setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber';
import { APIRequestContext, APIResponse, BrowserContext, Page } from 'playwright';
import { config } from './config';
import { CatalogueApiClient } from '../api/CatalogueApiClient';
import { EmiCalculatorPage } from '../pages/EmiCalculatorPage';
import { LoanInput } from './utils/emi-calculator';
import { BarTooltip } from '../pages/components/BarChart';

setDefaultTimeout(120_000);

/**
 * Per-scenario state. Cucumber creates a fresh World for every scenario, so nothing leaks
 * between scenarios. Browser/API handles are attached by the tagged hooks in hooks.ts.
 */
export class CustomWorld extends World {
  readonly config = config;

  // UI
  context?: BrowserContext;
  page?: Page;
  emiPage?: EmiCalculatorPage;
  loan?: LoanInput;
  startMonth?: { month: number; year: number };
  barTooltip?: BarTooltip;

  // API
  request?: APIRequestContext;
  api?: CatalogueApiClient;
  response?: APIResponse;
  responseBody?: any;

  // SQL
  sqlRows?: Record<string, unknown>[];

  constructor(options: IWorldOptions) {
    super(options);
  }

  get ui(): EmiCalculatorPage {
    if (!this.emiPage) throw new Error('No browser page — is the scenario tagged @ui?');
    return this.emiPage;
  }

  get catalogue(): CatalogueApiClient {
    if (!this.api) throw new Error('No API client — is the scenario tagged @api?');
    return this.api;
  }

  get body(): any {
    if (this.responseBody === undefined) throw new Error('No response has been received yet.');
    return this.responseBody;
  }
}

setWorldConstructor(CustomWorld);
