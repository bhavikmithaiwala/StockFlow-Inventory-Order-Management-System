import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Api } from './api';
describe('API lookup pagination', () => {
  it('loads subsequent pages instead of silently truncating catalog choices', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const lookup = TestBed.inject(Api).all<{ id: number }>('categories');
    http
      .expectOne('/api/categories?page=1&limit=100')
      .flush({ data: Array.from({ length: 100 }, (_, id) => ({ id })), meta: { total: 101 } });
    await Promise.resolve();
    http
      .expectOne('/api/categories?page=2&limit=100')
      .flush({ data: [{ id: 100 }], meta: { total: 101 } });
    expect((await lookup).length).toBe(101);
    http.verify();
  });
});
