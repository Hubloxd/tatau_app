import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  ImageDetailApiService,
  type CommentItem,
  type ImageDetail,
} from '../../core/services/image-detail-api.service';

@Component({
  selector: 'app-image-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './image-detail.html',
})
export class ImageDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ImageDetailApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected loading = true;
  protected notFound = false;
  protected loadError: string | null = null;

  protected image: ImageDetail | null = null;
  protected likes = 0;
  protected saves = 0;
  protected userLiked = false;
  protected userSaved = false;
  protected comments: CommentItem[] = [];

  protected commentText = '';
  protected commentSubmitting = false;
  protected commentError: string | null = null;

  protected likeBusy = false;
  protected saveBusy = false;

  private imageId = 0;

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('imageId');
    const id = raw ? Number(raw) : NaN;
    if (!Number.isFinite(id) || id < 1) {
      this.notFound = true;
      this.loading = false;
      return;
    }
    this.imageId = id;
    this.loadDetail();
  }

  private loadDetail(): void {
    this.loading = true;
    this.loadError = null;
    this.api.getImage(this.imageId).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          if (res.status !== 'success' || !res.image) {
            this.notFound = true;
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }
          this.image = res.image;
          const uid = this.auth.user()?.id ?? null;
          forkJoin({
            interactions: this.api.getInteractions(this.imageId, uid),
            comments: this.api.getComments(this.imageId),
          }).subscribe({
            next: ({ interactions, comments }) => {
              queueMicrotask(() => {
                this.loading = false;
                if (interactions.status === 'success') {
                  this.likes = interactions.likes;
                  this.saves = interactions.saves;
                  this.userLiked = interactions.user_liked;
                  this.userSaved = interactions.user_saved;
                }
                if (comments.status === 'success') {
                  this.comments = comments.comments;
                }
                this.recordViewIfLoggedIn();
                this.cdr.markForCheck();
              });
            },
            error: () => {
              queueMicrotask(() => {
                this.loading = false;
                this.loadError = 'Nie udało się wczytać interakcji ani komentarzy.';
                this.cdr.markForCheck();
              });
            },
          });
        });
      },
      error: (err: HttpErrorResponse) => {
        queueMicrotask(() => {
          this.loading = false;
          if (err.status === 404) {
            this.notFound = true;
          } else {
            this.loadError = 'Nie udało się wczytać zdjęcia.';
          }
          this.cdr.markForCheck();
        });
      },
    });
  }

  private recordViewIfLoggedIn(): void {
    const u = this.auth.user();
    if (!u || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.api.recordInteraction(this.imageId, u.id, 'view').subscribe({
      error: () => {},
    });
  }

  protected like(): void {
    const u = this.auth.user();
    if (!u || this.userLiked || this.likeBusy) {
      return;
    }
    this.likeBusy = true;
    this.api.recordInteraction(this.imageId, u.id, 'like').subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.likeBusy = false;
          if (res.status === 'success') {
            this.userLiked = true;
            this.likes += 1;
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.likeBusy = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected save(): void {
    const u = this.auth.user();
    if (!u || this.userSaved || this.saveBusy) {
      return;
    }
    this.saveBusy = true;
    this.api.recordInteraction(this.imageId, u.id, 'save').subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.saveBusy = false;
          if (res.status === 'success') {
            this.userSaved = true;
            this.saves += 1;
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.saveBusy = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected submitComment(): void {
    const u = this.auth.user();
    const text = this.commentText.trim();
    if (!u || !text || this.commentSubmitting) {
      return;
    }
    this.commentError = null;
    this.commentSubmitting = true;
    this.api.addComment(u.id, this.imageId, text).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.commentSubmitting = false;
          if (res.status === 'success' && res.comment) {
            this.comments = [...this.comments, res.comment];
            this.commentText = '';
          } else {
            this.commentError = res.message ?? 'Nie udało się dodać komentarza.';
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.commentSubmitting = false;
          this.commentError = 'Błąd sieci.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected back(): void {
    void this.router.navigateByUrl('/home');
  }

  protected detailInitials(username: string | null, userId: number): string {
    const base = (username ?? '').trim() || `u${userId}`;
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase() || '?';
  }
}
