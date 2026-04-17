import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './placeholder.html',
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly page = toSignal(
    combineLatest([this.route.data, this.route.queryParamMap]).pipe(
      map(([data, q]) => ({
        title: (data['pageTitle'] as string) ?? 'Strona',
        body: (data['body'] as string) ?? 'Ta sekcja będzie wkrótce dostępna.',
        showRegisteredOk: q.get('registered') === '1',
      })),
    ),
    {
      initialValue: {
        title: (this.route.snapshot.data['pageTitle'] as string) ?? 'Strona',
        body:
          (this.route.snapshot.data['body'] as string) ??
          'Ta sekcja będzie wkrótce dostępna.',
        showRegisteredOk:
          this.route.snapshot.queryParamMap.get('registered') === '1',
      },
    },
  );
}
