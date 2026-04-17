import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserProfilePayload {
  id: number;
  username: string;
  email: string;
  user_type: string;
  bio: string | null;
  avatar_url: string | null;
  profile_public: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);

  getSettings(userId: number): Observable<{ status: string; user: UserProfilePayload }> {
    return this.http.get<{ status: string; user: UserProfilePayload }>(
      `/user/settings/${userId}`,
    );
  }

  updateSettings(
    userId: number,
    body: { email: string; bio: string; profile_public: boolean },
  ): Observable<{ status: string; user: UserProfilePayload }> {
    return this.http.put<{ status: string; user: UserProfilePayload }>(
      `/user/settings/${userId}`,
      body,
    );
  }

  changePassword(
    userId: number,
    body: { old_password: string; new_password: string },
  ): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `/user/change_password/${userId}`,
      body,
    );
  }

  uploadAvatar(userId: number, file: File): Observable<{
    status: string;
    avatar_url?: string;
    user?: UserProfilePayload;
  }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{
      status: string;
      avatar_url?: string;
      user?: UserProfilePayload;
    }>(`/user/avatar/${userId}`, form);
  }
}
