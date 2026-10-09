import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Login } from './login';
import { SessionState } from './session';
describe('Login form', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('blocks invalid submission before making any request', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.submit();
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectNone('/api/auth/login');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Enter a valid email');
  });
  it('renders server failures, clears busy state, and remains unauthenticated', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.setValue({ email: 'staff@example.test', password: 'wrong' });
    fixture.componentInstance.submit();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/login')
      .flush(
        { error: { message: 'Email or password is incorrect' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('incorrect');
    expect(fixture.componentInstance.busy()).toBeFalse();
    expect(TestBed.inject(SessionState).user()).toBeNull();
  });
  it('navigates only after a successful server login and updates session identity', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.setValue({
      email: 'staff@example.test',
      password: 'example-password',
    });
    fixture.componentInstance.submit();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/login')
      .flush({ data: { id: '1', name: 'Staff', email: 'staff@example.test', role: 'staff' } });
    expect(navigate).toHaveBeenCalledWith('/');
    expect(TestBed.inject(SessionState).user()?.name).toBe('Staff');
  });
});
