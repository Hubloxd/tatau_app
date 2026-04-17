import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  ProfileApiService,
  type UserGalleryImage,
} from '../../core/services/profile-api.service';
import { SettingsApiService } from '../../core/services/settings-api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ProfileApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected loadError: string | null = null;
  protected images: UserGalleryImage[] = [];

  ngOnInit(): void {
    const u = this.auth.user();
    if (!u) {
      this.loading = false;
      return;
    }
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

    this.api.getUserImages(u.id).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.loading = false;
          if (res.status === 'success') {
            this.images = res.images ?? [];
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
