import { computed, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'user';

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  user_type: string;
  bio?: string | null;
  avatar_url?: string | null;
  profile_public?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<SessionUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this._user.set(JSON.parse(raw) as SessionUser);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  setSession(user: SessionUser): void {
    this._user.set(user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }

  logout(): void {
    this._user.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
