import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SessionState } from './session';

describe('server-backed session state', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('loads a real server user and clears state after successful logout', () => {
    const session = TestBed.inject(SessionState);
    const http = TestBed.inject(HttpTestingController);
    session.load().subscribe();
    http
      .expectOne('/api/auth/me')
      .flush({ data: { id: '1', name: 'Staff', email: 'staff@example.test', role: 'staff' } });
    expect(session.user()?.role).toBe('staff');
    session.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null);
    expect(session.user()).toBeNull();
  });
  it('does not authenticate on a rejected login', () => {
    const session = TestBed.inject(SessionState);
    session
      .login({ email: 'bad@example.test', password: 'wrong' })
      .subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.user()).toBeNull();
  });
});
