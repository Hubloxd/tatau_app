import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserGalleryImage {
  id: number;
  url: string;
  description: string | null;
}

export interface UserImagesResponse {
  status: string;
  images: UserGalleryImage[];
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  getUserImages(userId: number): Observable<UserImagesResponse> {
    return this.http.get<UserImagesResponse>(`/image/images/${userId}`);
  }
}
