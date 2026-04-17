import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface FeedImage {
  id: number;
  url: string;
  description: string | null;
  user_id: number;
  username: string;
  user_type: string;
  /** Polubienia (interactions typu like) */
  likes_count: number;
  /** Komentarze z tabeli comments */
  comments_count: number;
  /** Czy bieżący użytkownik (user_id z zapytania) polubił */
  user_liked: boolean;
}

export interface FeedResponse {
  status: string;
  images: FeedImage[];
  count: number;
}

@Injectable({ providedIn: 'root' })
export class FeedApiService {
  private readonly http = inject(HttpClient);

  getFeed(userId: number, limit = 12, offset = 0): Observable<FeedResponse> {
    let params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset))
      .set('user_id', String(userId));
    return this.http.get<FeedResponse>('/image/feed', { params });
  }

  uploadImage(
    userId: number,
    file: File,
    description: string,
  ): Observable<{ status: string; public_url?: string; error?: string }> {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams()
      .set('user_id', String(userId))
      .set('description', description);
    return this.http.post<{ status: string; public_url?: string; error?: string }>(
      '/image/upload',
      form,
      { params },
    );
  }
}
