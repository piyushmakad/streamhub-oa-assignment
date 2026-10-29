import { APIRequestContext, APIResponse } from 'playwright';

export type QueryParams = Record<string, string | string[]>;

/**
 * Thin client over Playwright's APIRequestContext. Step definitions talk to endpoints by
 * name, so a route change is a one-line fix here rather than a search through every step.
 */
export class CatalogueApiClient {
  static readonly endpoints = {
    health: '/health',
    titles: '/api/titles',
    title: (id: string | number) => `/api/titles/${id}`,
    genres: '/api/genres',
  } as const;

  constructor(private readonly request: APIRequestContext) {}

  /** Repeated keys are sent as repeated query parameters (?type=a&type=b). */
  private static toSearch(params: QueryParams = {}): string {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) for (const item of [v].flat()) search.append(k, item);
    const s = search.toString();
    return s ? `?${s}` : '';
  }

  get(path: string, params?: QueryParams): Promise<APIResponse> {
    return this.request.get(`${path}${CatalogueApiClient.toSearch(params)}`);
  }

  listTitles(params?: QueryParams) {
    return this.get(CatalogueApiClient.endpoints.titles, params);
  }

  getTitle(id: string | number, params?: QueryParams) {
    return this.get(CatalogueApiClient.endpoints.title(id), params);
  }

  listGenres(params?: QueryParams) {
    return this.get(CatalogueApiClient.endpoints.genres, params);
  }

  health() {
    return this.get(CatalogueApiClient.endpoints.health);
  }
}
