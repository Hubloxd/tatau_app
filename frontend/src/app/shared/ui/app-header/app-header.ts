import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
} from 'rxjs/operators';
import {
  UserSearchApiService,
  type UserSearchHit,
} from '../../../core/services/user-search-api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './app-header.html',
})
export class AppHeaderComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly userSearch = inject(UserSearchApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly search$ = new Subject<string>();
  /** W rosnącej kolejności — odrzucamy odpowiedzi HTTP «w tyle» za aktualnym zapytaniem. */
  private searchRequestSerial = 0;

  @ViewChild('searchHost', { read: ElementRef })
  private searchHost?: ElementRef<HTMLElement>;

  protected searchQuery = '';
  protected searchResults: UserSearchHit[] = [];
  protected searchLoading = false;
  protected searchFocused = false;

  constructor() {
    this.search$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((raw) => {
          const requestId = ++this.searchRequestSerial;
          const term = raw.trim();
          if (term.length < 2) {
            this.searchResults = [];
            this.searchLoading = false;
            return of({ requestId, res: null });
          }
          this.searchLoading = true;
          this.cdr.markForCheck();
          return this.userSearch.search(term).pipe(
            map((res) => ({ requestId, res })),
            finalize(() => {
              this.searchLoading = false;
              this.cdr.markForCheck();
            }),
            catchError(() =>
              of({
                requestId,
                res: { status: 'error' as const, users: [] as UserSearchHit[] },
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((payload) => {
        if (payload.requestId !== this.searchRequestSerial) {
          return;
        }
        if (payload.res === null) {
          this.cdr.markForCheck();
          return;
        }
        if (payload.res.status === 'success') {
          this.searchResults = payload.res.users;
        } else {
          this.searchResults = [];
        }
        this.cdr.markForCheck();
      });
  }

  protected onSearchModelChange(value: string): void {
    this.search$.next(value);
  }

  protected onSearchFocus(): void {
    this.searchFocused = true;
  }

  protected selectUser(u: UserSearchHit): void {
    void this.router.navigate(['/profile', u.id]);
    this.searchQuery = '';
    this.searchResults = [];
    this.searchFocused = false;
    this.search$.next('');
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(ev: MouseEvent): void {
    const host = this.searchHost?.nativeElement;
    if (host && !host.contains(ev.target as Node)) {
      this.searchFocused = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.searchFocused = false;
    }
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
