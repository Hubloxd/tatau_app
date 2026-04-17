import {
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FeedApiService } from '../../core/services/feed-api.service';
import { DashboardSidebarComponent } from '../../shared/ui/dashboard-sidebar/dashboard-sidebar';
import { PhotoDropzoneComponent } from '../../shared/ui/photo-dropzone/photo-dropzone';

@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DashboardSidebarComponent,
    PhotoDropzoneComponent,
  ],
  templateUrl: './photo-upload.html',
})
export class PhotoUploadComponent {
  protected readonly auth = inject(AuthService);
  private readonly feedApi = inject(FeedApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('dropzone') private dropzone?: PhotoDropzoneComponent;

  protected postText = '';
  protected selectedFile: File | null = null;
  protected uploadSubmitting = false;
  protected uploadError: string | null = null;

  protected onFileSelected(file: File | null): void {
    this.selectedFile = file;
  }

  protected submitPost(): void {
    const u = this.auth.user();
    if (!u || !this.selectedFile) {
      this.uploadError = 'Wybierz zdjęcie, aby opublikować post.';
      return;
    }
    this.uploadError = null;
    this.uploadSubmitting = true;
    this.feedApi.uploadImage(u.id, this.selectedFile, this.postText.trim()).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.uploadSubmitting = false;
          if (res.status === 'success') {
            this.postText = '';
            this.selectedFile = null;
            this.dropzone?.clear();
            void this.router.navigateByUrl('/home');
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
}
