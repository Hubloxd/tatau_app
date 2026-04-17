import { Component, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/services/auth-api.service';

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

  protected readonly form = this.fb.group({
    username: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: this.fb.control('', {
      validators: [Validators.required, Validators.email],
    }),
    password: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
    userType: this.fb.control<'artist' | 'client' | 'studio'>('artist', {
      validators: [Validators.required],
    }),
  });

  protected submitting = false;
  protected serverError: string | null = null;

  protected submit(): void {
    this.serverError = null;
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
            this.serverError =
              res.error ?? 'Rejestracja nie powiodła się. Spróbuj ponownie.';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          const body = err.error;
          let msg = 'Serwer nie odpowiada. Sprawdź połączenie i spróbuj ponownie.';
          if (body && typeof body === 'object' && 'error' in body) {
            const e = (body as { error?: string }).error;
            if (typeof e === 'string') {
              msg = e;
            }
          }
          this.serverError = msg;
        },
      });
  }
}
