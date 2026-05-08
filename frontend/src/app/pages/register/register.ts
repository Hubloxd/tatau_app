import { Component, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';
import { ToastService } from '../../core/services/toast.service';

/** Spójne z backendem (services/user_service.py). */
const SAFE_USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const SAFE_EMAIL_REGEX = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group({
    username: this.fb.control('', {
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(32),
        Validators.pattern(SAFE_USERNAME_REGEX),
      ],
    }),
    email: this.fb.control('', {
      validators: [Validators.required, Validators.pattern(SAFE_EMAIL_REGEX)],
    }),
    password: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
    userType: this.fb.control<'artist' | 'client' | 'studio'>('artist', {
      validators: [Validators.required],
    }),
  });

  protected submitting = false;

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const v = this.form.getRawValue();
    this.authApi
      .register({
        username: v.username,
        email: v.email,
        password: v.password,
        userType: v.userType,
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          if (res.status === 'success') {
            void this.router.navigate(['/login'], {
              queryParams: { registered: '1' },
            });
          } else {
            this.toast.showError(
              res.error ?? 'Rejestracja nie powiodła się. Spróbuj ponownie.',
            );
          }
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          const body = err.error;
          let msg = 'Serwer nie odpowiada. Sprawdź połączenie i spróbuj ponownie.';
          if (body && typeof body === 'object') {
            const o = body as { error?: string; detail?: string; message?: string };
            if (typeof o.error === 'string') {
              msg = o.error;
            } else if (typeof o.detail === 'string') {
              msg = o.detail;
            } else if (typeof o.message === 'string') {
              msg = o.message;
            }
          }
          this.toast.showError(msg);
        },
      });
  }
}
