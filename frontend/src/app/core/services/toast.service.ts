import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ToastItem[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 0;

  /** Toast błędu (np. nieudane logowanie); znika po kilku sekundach. */
  showError(message: string, durationMs = 6000): void {
    const id = ++this.nextId;
    this._toasts.update((list) => [...list, { id, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
