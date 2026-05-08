import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserGalleryImage {
  id: number;
  url: string;
  description: string | null;
  mime_type?: string | null;
}

export interface UserImagesResponse {
  status: string;
  images: UserGalleryImage[];
  /** Profil prywatny — obcy nie widzi galerii */
  gallery_hidden?: boolean;
}

/** Odpowiedź GET /user/user/{id} (widok z perspektywy follower_id) */
export interface ProfileUserPayload {
  id: number;
  username: string;
  user_type: string;
  avatar_url: string | null;
  profile_public: boolean;
  bio: string | null;
  email?: string;
  profile_limited?: boolean;
  is_following?: boolean;
}

export interface ProfileUserResponse {
  status: string;
  user?: ProfileUserPayload;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  getUserProfile(
    userId: number,
    followerId: number | null,
  ): Observable<ProfileUserResponse> {
    let params = new HttpParams();
    if (followerId != null) {
      params = params.set('follower_id', String(followerId));
    }
    return this.http.get<ProfileUserResponse>(`/user/user/${userId}`, {
      params,
    });
  }

  getUserImages(
    userId: number,
    viewerId: number | null,
  ): Observable<UserImagesResponse> {
    let params = new HttpParams();
    if (viewerId != null) {
      params = params.set('viewer_id', String(viewerId));
    }
    return this.http.get<UserImagesResponse>(`/image/images/${userId}`, {
      params,
    });
  }
}
