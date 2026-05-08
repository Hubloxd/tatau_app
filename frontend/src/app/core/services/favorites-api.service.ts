import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface SavedImage {
  id: number;
  url: string;
  description: string | null;
  user_id: number;
  username: string;
  user_type: string;
}

export interface SavedImagesResponse {
  status: string;
  images: SavedImage[];
}

@Injectable({ providedIn: 'root' })
export class FavoritesApiService {
  private readonly http = inject(HttpClient);

  getSavedImages(userId: number): Observable<SavedImagesResponse> {
    return this.http.get<SavedImagesResponse>(`/image/saved/${userId}`);
  }
}
