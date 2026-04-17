import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SettingsApiService } from '../../core/services/settings-api.service';
import { DashboardSidebarComponent } from '../../shared/ui/dashboard-sidebar/dashboard-sidebar';
import { PhotoDropzoneComponent } from '../../shared/ui/photo-dropzone/photo-dropzone';

function passwordMatchValidator(
  group: AbstractControl,
): ValidationErrors | null {
  const newP = group.get('newPassword')?.value;
  const c = group.get('confirmPassword')?.value;
  if (!newP || c == null || c === '') {
    return null;
  }
  return newP === c ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DashboardSidebarComponent,
    PhotoDropzoneComponent,
  ],
  templateUrl: './settings.html',
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly auth = inject(AuthService);
  private readonly api = inject(SettingsApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('avatarDropzone') protected dropzone?: PhotoDropzoneComponent;

  protected loading = true;
  protected loadError: string | null = null;

  protected profileSaving = false;
  protected profileSuccess = false;
  protected profileError: string | null = null;

  protected passwordSaving = false;
  protected passwordSuccess = false;
  protected passwordError: string | null = null;

  protected avatarUploading = false;
  protected avatarError: string | null = null;

  protected readonly profileForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(2000)]],
    profile_public: [true],
  });

  protected readonly passwordForm = this.fb.group(
    {
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    const u = this.auth.user();
    if (!u) {
      this.loading = false;
      return;
    }
    this.api.getSettings(u.id).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.loading = false;
          if (res.status === 'success' && res.user) {
            this.profileForm.patchValue({
              email: res.user.email,
              bio: res.user.bio ?? '',
              profile_public: res.user.profile_public ?? true,
            });
            this.auth.setSession({
              ...u,
              email: res.user.email,
              bio: res.user.bio,
              avatar_url: res.user.avatar_url,
              profile_public: res.user.profile_public,
            });
          } else {
            this.loadError = 'Nie udało się wczytać ustawień.';
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.loading = false;
          this.loadError = 'Nie udało się wczytać ustawień.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected saveProfile(): void {
    this.profileError = null;
    this.profileSuccess = false;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const u = this.auth.user();
    if (!u) {
      return;
    }
    const v = this.profileForm.getRawValue();
    this.profileSaving = true;
    this.api
      .updateSettings(u.id, {
        email: v.email.trim(),
        bio: v.bio.trim(),
        profile_public: v.profile_public,
      })
      .subscribe({
        next: (res) => {
          queueMicrotask(() => {
            this.profileSaving = false;
            if (res.status === 'success' && res.user) {
              this.profileSuccess = true;
              this.auth.setSession({
                ...u,
                email: res.user.email,
                bio: res.user.bio,
                avatar_url: res.user.avatar_url,
                profile_public: res.user.profile_public,
              });
            }
            this.cdr.markForCheck();
          });
        },
        error: (err: HttpErrorResponse) => {
          queueMicrotask(() => {
            this.profileSaving = false;
            const body = err.error;
            this.profileError =
              body && typeof body === 'object' && 'message' in body
                ? String(body.message)
                : 'Zapis nie powiódł się.';
            this.cdr.markForCheck();
          });
        },
      });
  }

  protected savePassword(): void {
    this.passwordError = null;
    this.passwordSuccess = false;
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const u = this.auth.user();
    if (!u) {
      return;
    }
    const v = this.passwordForm.getRawValue();
    this.passwordSaving = true;
    this.api
      .changePassword(u.id, {
        old_password: v.oldPassword,
        new_password: v.newPassword,
      })
      .subscribe({
        next: (res) => {
          queueMicrotask(() => {
            this.passwordSaving = false;
            if (res.status === 'success') {
              this.passwordSuccess = true;
              this.passwordForm.reset();
            }
            this.cdr.markForCheck();
          });
        },
        error: (err: HttpErrorResponse) => {
          queueMicrotask(() => {
            this.passwordSaving = false;
            const body = err.error;
            this.passwordError =
              body && typeof body === 'object' && 'message' in body
                ? String(body.message)
                : 'Zmiana hasła nie powiodła się.';
            this.cdr.markForCheck();
          });
        },
      });
  }

  protected onAvatarFile(file: File | null): void {
    if (!file) {
      return;
    }
    const u = this.auth.user();
    if (!u) {
      return;
    }
    this.avatarError = null;
    this.avatarUploading = true;
    this.api.uploadAvatar(u.id, file).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.avatarUploading = false;
          if (res.status === 'success' && res.user) {
            this.auth.setSession({
              ...u,
              avatar_url: res.user.avatar_url,
            });
            this.dropzone?.clear();
          }
          this.cdr.markForCheck();
        });
      },
      error: () => {
        queueMicrotask(() => {
          this.avatarUploading = false;
          this.avatarError = 'Nie udało się przesłać zdjęcia profilowego.';
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected passwordMismatch(): boolean {
    return !!this.passwordForm.errors?.['passwordMismatch'];
  }
}
