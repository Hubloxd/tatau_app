import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ImageDetail {
  id: number;
  url: string;
  description: string | null;
  user_id: number;
  username: string | null;
  user_type: string | null;
  avatar_url?: string | null;
  mime_type?: string | null;
}

export interface ImageDetailResponse {
  status: string;
  image?: ImageDetail;
  error?: string;
}

export interface InteractionsResponse {
  status: string;
  likes: number;
  comments: number;
  saves: number;
  user_liked: boolean;
  user_saved: boolean;
}

export interface CommentItem {
  id: number;
  user_id: number;
  username: string;
  content: string;
  timestamp: string;
}

export interface CommentsResponse {
  status: string;
  comments: CommentItem[];
}

@Injectable({ providedIn: 'root' })
export class ImageDetailApiService {
  private readonly http = inject(HttpClient);

  getImage(imageId: number): Observable<ImageDetailResponse> {
    return this.http.get<ImageDetailResponse>(`/image/image/${imageId}`);
  }

  getInteractions(
    imageId: number,
    userId: number | null,
  ): Observable<InteractionsResponse> {
    let params = new HttpParams();
    if (userId != null) {
      params = params.set('user_id', String(userId));
    }
    return this.http.get<InteractionsResponse>(`/interaction/image/${imageId}`, {
      params,
    });
  }

  recordInteraction(
    imageId: number,
    userId: number,
    interactionType: 'like' | 'save' | 'view',
  ): Observable<{ status: string }> {
    const params = new HttpParams()
      .set('image_id', String(imageId))
      .set('user_id', String(userId))
      .set('interaction_type', interactionType);
    return this.http.post<{ status: string }>(
      '/interaction/record-interaction',
      null,
      { params },
    );
  }

  removeInteraction(
    imageId: number,
    userId: number,
    interactionType: 'like' | 'save',
  ): Observable<{ status: string; removed?: boolean }> {
    const params = new HttpParams()
      .set('image_id', String(imageId))
      .set('user_id', String(userId))
      .set('interaction_type', interactionType);
    return this.http.delete<{ status: string; removed?: boolean }>(
      '/interaction/record-interaction',
      { params },
    );
  }

  getComments(imageId: number): Observable<CommentsResponse> {
    return this.http.get<CommentsResponse>(`/comment/image/${imageId}`);
  }

  addComment(
    userId: number,
    imageId: number,
    content: string,
  ): Observable<{
    status: string;
    comment?: CommentItem;
    message?: string;
  }> {
    return this.http.post<{
      status: string;
      comment?: CommentItem;
      message?: string;
    }>(`/comment/add`, {
      user_id: userId,
      image_id: imageId,
      content,
    });
  }
}
