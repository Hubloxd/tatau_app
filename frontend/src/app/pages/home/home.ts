import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSidebarComponent } from '../../shared/ui/dashboard-sidebar/dashboard-sidebar';
import { PhotoDropzoneComponent } from '../../shared/ui/photo-dropzone/photo-dropzone';
import {
  FeedApiService,
  type FeedImage,
} from '../../core/services/feed-api.service';
import { ImageDetailApiService } from '../../core/services/image-detail-api.service';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DashboardSidebarComponent,
    PhotoDropzoneComponent,
  ],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly feedApi = inject(FeedApiService);
  private readonly imageInteractions = inject(ImageDetailApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('scrollSentinel', { read: ElementRef })
  private sentinel?: ElementRef<HTMLElement>;

  @ViewChild('mainScroll', { read: ElementRef })
  private mainScroll?: ElementRef<HTMLElement>;

  @ViewChild('dropzone') private dropzone?: PhotoDropzoneComponent;

  protected images: FeedImage[] = [];
  /** Na kliencie startujemy od spinnera; na SSR bez fetch ustawiane w ngOnInit na false. */
  protected loading = true;
  protected loadingMore = false;
  protected loadError: string | null = null;
  protected hasMore = true;
  private offset = 0;

  protected postText = '';
  protected selectedFile: File | null = null;
  protected uploadSubmitting = false;
  protected uploadError: string | null = null;
  protected uploadOk = false;

  private observer: IntersectionObserver | null = null;

  /** Szybki like z siatki — id obrazu w trakcie zapisu */
  private readonly likeBusyIds = new Set<number>();

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    if (!this.auth.user()) {
      this.loading = false;
      return;
    }
    this.loadInitial();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const el = this.sentinel?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const scrollRoot = this.mainScroll?.nativeElement ?? null;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.loadMore();
        }
      },
      { root: scrollRoot, rootMargin: '480px', threshold: 0 },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private loadInitial(): void {
    const u = this.auth.user();
    if (!u) {
      return;
    }
    this.loading = true;
    this.loadError = null;
    this.offset = 0;
    this.images = [];
    this.hasMore = true;
    this.feedApi.getFeed(u.id, PAGE_SIZE, 0).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.loading = false;
          if (res.status === 'success') {
            this.images = res.images;
            this.offset = res.images.length;
            this.hasMore = res.images.length >= PAGE_SIZE;
          } else {
            this.loadError = 'Nie udało się wczytać feedu.';
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.loading = false;
          this.loadError =
            'Nie udało się połączyć z serwerem. Sprawdź, czy backend działa.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected loadMore(): void {
    const u = this.auth.user();
    if (!u || this.loadingMore || !this.hasMore || this.loading) {
      return;
    }
    this.loadingMore = true;
    this.feedApi.getFeed(u.id, PAGE_SIZE, this.offset).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.loadingMore = false;
          if (res.status !== 'success') {
            this.cdr.markForCheck();
            return;
          }
          const seen = new Set(this.images.map((i) => i.id));
          for (const img of res.images) {
            if (!seen.has(img.id)) {
              seen.add(img.id);
              this.images.push(img);
            }
          }
          this.offset += res.images.length;
          this.hasMore = res.images.length >= PAGE_SIZE;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.loadingMore = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected onFileSelected(file: File | null): void {
    this.selectedFile = file;
    this.uploadOk = false;
  }

  protected submitPost(): void {
    const u = this.auth.user();
    if (!u || !this.selectedFile) {
      this.uploadError = 'Wybierz zdjęcie, aby opublikować post.';
      return;
    }
    this.uploadError = null;
    this.uploadOk = false;
    this.uploadSubmitting = true;
    this.feedApi.uploadImage(u.id, this.selectedFile, this.postText.trim()).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.uploadSubmitting = false;
          if (res.status === 'success') {
            this.uploadOk = true;
            this.postText = '';
            this.selectedFile = null;
            this.dropzone?.clear();
            this.loadInitial();
          } else {
            this.uploadError = res.error ?? 'Upload nie powiódł się.';
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.uploadSubmitting = false;
          this.uploadError = 'Błąd sieci lub serwera.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected retryFeed(): void {
    this.loadInitial();
  }

  protected isLikeBusy(imageId: number): boolean {
    return this.likeBusyIds.has(imageId);
  }

  protected quickLike(event: MouseEvent, item: FeedImage): void {
    event.preventDefault();
    event.stopPropagation();
    const u = this.auth.user();
    if (!u || item.user_liked || this.likeBusyIds.has(item.id)) {
      return;
    }
    this.likeBusyIds.add(item.id);
    this.imageInteractions.recordInteraction(item.id, u.id, 'like').subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.likeBusyIds.delete(item.id);
          if (res.status === 'success') {
            item.user_liked = true;
            item.likes_count += 1;
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.likeBusyIds.delete(item.id);
          this.cdr.markForCheck();
        });
      },
    });
  }
}
