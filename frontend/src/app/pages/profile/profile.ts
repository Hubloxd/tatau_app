import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  ProfileApiService,
  type ProfileUserPayload,
  type UserGalleryImage,
} from '../../core/services/profile-api.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { isVideoMime } from '../../shared/util/media-type';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly isVideoMime = isVideoMime;
  private readonly api = inject(ProfileApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  private routeSub?: Subscription;

  protected loading = true;
  protected loadError: string | null = null;
  protected notFound = false;
  protected images: UserGalleryImage[] = [];
  protected galleryHidden = false;

  protected profile: ProfileUserPayload | null = null;
  protected isOwnProfile = false;

  ngOnInit(): void {
    const u = this.auth.user();
    if (!u) {
      this.loading = false;
      return;
    }
    this.routeSub = this.route.paramMap.subscribe((pm) => {
      const raw = pm.get('userId');
      const pid = raw ? Number(raw) : u.id;
      if (!Number.isFinite(pid) || pid < 1) {
        this.notFound = true;
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }
      this.loadProfile(pid);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private loadProfile(profileUserId: number): void {
    const u = this.auth.user();
    if (!u) {
      return;
    }

    this.loading = true;
    this.loadError = null;
    this.notFound = false;
    this.galleryHidden = false;
    this.profile = null;
    this.images = [];
    this.isOwnProfile = profileUserId === u.id;

    const followerId = u.id;

    if (this.isOwnProfile) {
      this.settingsApi.getSettings(u.id).subscribe({
        next: (sres) => {
          queueMicrotask(() => {
            if (sres.status === 'success' && sres.user) {
              const cur = this.auth.user();
              if (cur) {
                this.auth.setSession({
                  ...cur,
                  email: sres.user.email,
                  bio: sres.user.bio,
                  avatar_url: sres.user.avatar_url,
                  profile_public: sres.user.profile_public,
                });
              }
            }
            this.cdr.markForCheck();
          });
        },
        error: () => {},
      });
    }

    this.api.getUserProfile(profileUserId, followerId).subscribe({
      next: (pres) => {
        queueMicrotask(() => {
          if (pres.status !== 'success' || !pres.user) {
            this.loadError = pres.message ?? 'Nie udało się wczytać profilu.';
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }
          this.profile = pres.user;
          this.api.getUserImages(profileUserId, followerId).subscribe({
            next: (ires) => {
              queueMicrotask(() => {
                this.loading = false;
                if (ires.status === 'success') {
                  this.images = ires.images ?? [];
                  this.galleryHidden = !!ires.gallery_hidden;
                } else {
                  this.loadError = 'Nie udało się wczytać galerii.';
                }
                this.cdr.markForCheck();
              });
            },
            error: () => {
              queueMicrotask(() => {
                this.loading = false;
                this.loadError = 'Nie udało się wczytać galerii.';
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
            this.loadError = 'Nie udało się wczytać profilu.';
          }
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected initials(username: string): string {
    const parts = username.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
    }
    const s = parts[0] ?? username;
    return s.slice(0, 2).toUpperCase() || '?';
  }
}
