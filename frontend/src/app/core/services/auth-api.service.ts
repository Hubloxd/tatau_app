import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RegisterResponse {
  status?: string;
  user_id?: number;
  error?: string;
}

export interface LoginResponse {
  status?: string;
  message?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    user_type: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(payload: {
    usernameOrEmail: string;
    password: string;
  }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/user/login_user/', {
      username_or_email: payload.usernameOrEmail,
      password: payload.password,
    });
  }

  register(payload: {
    username: string;
    email: string;
    password: string;
    userType: string;
  }): Observable<RegisterResponse> {
    const params = new HttpParams()
      .set('username', payload.username)
      .set('email', payload.email)
      .set('password', payload.password)
      .set('user_type', payload.userType);

    return this.http.post<RegisterResponse>('/user/register_user', null, {
      params,
    });
  }
}
