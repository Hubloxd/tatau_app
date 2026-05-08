import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  FavoritesApiService,
  type SavedImage,
} from '../../core/services/favorites-api.service';
import { DashboardSidebarComponent } from '../../shared/ui/dashboard-sidebar/dashboard-sidebar';
import { isVideoMime } from '../../shared/util/media-type';

@Component({
  selector: 'app-ulubione',
  standalone: true,
  imports: [RouterLink, DashboardSidebarComponent],
  templateUrl: './ulubione.html',
})
export class UlubioneComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly isVideoMime = isVideoMime;
  private readonly api = inject(FavoritesApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected loadError: string | null = null;
  protected images: SavedImage[] = [];

  ngOnInit(): void {
    const u = this.auth.user();
    if (!u) {
      this.loading = false;
      return;
    }
    this.api.getSavedImages(u.id).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.loading = false;
          if (res.status === 'success') {
            this.images = res.images ?? [];
          } else {
            this.loadError = 'Nie udało się wczytać zapisanych zdjęć.';
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.loading = false;
          this.loadError = 'Nie udało się wczytać zapisanych zdjęć.';
          this.cdr.markForCheck();
        });
      },
    });
  }
}
