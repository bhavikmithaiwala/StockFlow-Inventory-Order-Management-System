import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import {
  provideRouter,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { isObservable } from 'rxjs';
import { authenticated, sessionExpiry } from './auth-guard';
import { SessionState } from './session';
import { Api } from './api';
describe('server-verified routes and session expiry', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpiry])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('checks the server even with a cached user and redirects an expired session', () => {
    const session = TestBed.inject(SessionState);
    session.user.set({ id: '1', name: 'Staff', email: 'staff@example.test', role: 'staff' });
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const result = TestBed.runInInjectionContext(() =>
      authenticated({} as ActivatedRouteSnapshot, { url: '/products' } as RouterStateSnapshot),
    );
    if (!isObservable(result)) throw new Error('Expected asynchronous server verification');
    let redirected = false;
    result.subscribe((value) => {
      redirected = (value as UrlTree).toString() === '/login';
    });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(redirected).toBeTrue();
    expect(session.user()).toBeNull();
  });
  it('clears identity and navigates to login when a protected API session expires', () => {
    const session = TestBed.inject(SessionState);
    session.user.set({ id: '1', name: 'Staff', email: 'staff@example.test', role: 'staff' });
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    TestBed.inject(Api)
      .get('products')
      .subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/products')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
