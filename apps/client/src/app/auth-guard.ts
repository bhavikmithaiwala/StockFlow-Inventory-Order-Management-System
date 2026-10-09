import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, map, of, throwError } from 'rxjs';
import { SessionState } from './session';

export const authenticated: CanActivateFn = () => {
  const session = inject(SessionState);
  const router = inject(Router);
  return session.load().pipe(
    map(() => true),
    catchError((error: HttpErrorResponse) =>
      of(router.createUrlTree([error.status === 401 ? '/login' : '/status'])),
    ),
  );
};
export const sessionExpiry: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionState);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !request.url.endsWith('/auth/login')) {
        session.user.set(null);
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
