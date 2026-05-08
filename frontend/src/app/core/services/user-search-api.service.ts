import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserSearchHit {
  id: number;
  username: string;
  user_type: string;
}

export interface UserSearchResponse {
  status: string;
  users: UserSearchHit[];
}

@Injectable({ providedIn: 'root' })
export class UserSearchApiService {
  private readonly http = inject(HttpClient);

  search(term: string): Observable<UserSearchResponse> {
    const params = new HttpParams().set('term', term.trim());
    return this.http.get<UserSearchResponse>('/user/search', { params });
  }
}
