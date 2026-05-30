import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSidebarComponent } from '../../shared/ui/dashboard-sidebar/dashboard-sidebar';

const BODY_PARTS = [
  { value: 'arm', label: 'Ramię' },
  { value: 'forearm', label: 'Przedramię' },
  { value: 'wrist', label: 'Nadgarstek' },
  { value: 'chest', label: 'Klatka piersiowa' },
  { value: 'back', label: 'Plecy' },
  { value: 'shoulder', label: 'Bark' },
  { value: 'neck', label: 'Szyja' },
  { value: 'thigh', label: 'Udo' },
  { value: 'calf', label: 'Łydka' },
  { value: 'ankle', label: 'Kostka' },
  { value: 'ribs', label: 'Żebra' },
  { value: 'hand', label: 'Dłoń' },
];

const STYLES = [
  { value: 'minimalist', label: 'Minimalistyczny' },
  { value: 'geometric', label: 'Geometryczny' },
  { value: 'realistic', label: 'Realistyczny' },
  { value: 'traditional old school', label: 'Tradycyjny (old school)' },
  { value: 'tribal', label: 'Tribal' },
  { value: 'dotwork', label: 'Dotwork' },
  { value: 'watercolor', label: 'Akwarela' },
  { value: 'blackwork', label: 'Blackwork' },
  { value: 'japanese', label: 'Japoński' },
  { value: 'fine line', label: 'Fine line' },
];

@Component({
  selector: 'app-tattoo-generator',
  standalone: true,
  imports: [FormsModule, DashboardSidebarComponent],
  templateUrl: './tattoo-generator.html',
})
export class TattooGeneratorComponent {
  protected readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);

  protected readonly bodyParts = BODY_PARTS;
  protected readonly styles = STYLES;

  protected selectedBodyPart = '';
  protected selectedStyle = '';
  protected description = '';
  protected generating = false;
  protected imageUrl: string | null = null;
  protected error: string | null = null;

  protected get canGenerate(): boolean {
    return !!this.selectedBodyPart && !!this.selectedStyle && !this.generating;
  }

  protected generate(): void {
    if (!this.canGenerate) return;

    const params = new HttpParams()
      .set('body_part', this.selectedBodyPart)
      .set('style', this.selectedStyle)
      .set('description', this.description.trim());

    this.generating = true;
    this.imageUrl = null;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<{ image_url: string }>('/api/generate-tattoo', { params }).subscribe({
      next: (res) => {
        queueMicrotask(() => {
          this.imageUrl = res.image_url;
          this.generating = false;
          this.cdr.markForCheck();
        });
      },
      error: (err) => {
        queueMicrotask(() => {
          this.error = err?.error?.detail ?? 'Nie udało się wygenerować obrazu. Spróbuj ponownie.';
          this.generating = false;
          this.cdr.markForCheck();
        });
      },
    });
  }

  protected reset(): void {
    this.imageUrl = null;
    this.error = null;
  }
}
