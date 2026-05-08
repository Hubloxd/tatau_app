import { Component, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApiService } from '../../core/services/auth-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly form = this.fb.group({
    usernameOrEmail: this.fb.control('', {
      validators: [Validators.required],
    }),
    password: this.fb.control('', {
      validators: [Validators.required],
    }),
  });

  protected submitting = false;
  protected readonly registeredHint =
    this.route.snapshot.queryParamMap.get('registered') === '1';

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting = true;
    this.authApi
      .login({
        usernameOrEmail: v.usernameOrEmail.trim(),
        password: v.password,
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          if (res.status === 'success' && res.user) {
            this.auth.setSession(res.user);
            const next = this.route.snapshot.queryParamMap.get('next');
            const target =
              next && next !== 'login' && !next.startsWith('register')
                ? `/${next}`
                : '/home';
            void this.router.navigateByUrl(target);
            return;
          }
          this.toast.showError(
            res.message ?? 'Logowanie nie powiodło się. Spróbuj ponownie.',
          );
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          const body = err.error;
          let msg = 'Serwer nie odpowiada. Sprawdź połączenie i spróbuj ponownie.';
          if (body && typeof body === 'object') {
            if ('message' in body && typeof body.message === 'string') {
              msg = body.message;
            } else if ('error' in body && typeof body.error === 'string') {
              msg = body.error;
            } else if ('detail' in body && typeof body.detail === 'string') {
              msg = body.detail;
            }
          }
          this.toast.showError(msg);
        },
      });
  }
}
