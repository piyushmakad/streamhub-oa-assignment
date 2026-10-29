import { Page } from 'playwright';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }
}
