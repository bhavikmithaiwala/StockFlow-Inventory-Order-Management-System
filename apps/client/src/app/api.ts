import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}
export interface Result<T> {
  data: T;
}
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  get<T>(path: string, query: Record<string, string | number | boolean> = {}) {
    return this.http.get<T>(`/api/${path}`, { params: new HttpParams({ fromObject: query }) });
  }
  post<T>(path: string, body: unknown) {
    return this.http.post<T>(`/api/${path}`, body);
  }
  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`/api/${path}`, body);
  }
  delete<T>(path: string) {
    return this.http.delete<T>(`/api/${path}`);
  }
}
