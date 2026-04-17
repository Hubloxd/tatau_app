import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-photo-dropzone',
  standalone: true,
  imports: [NgClass],
  templateUrl: './photo-dropzone.html',
})
export class PhotoDropzoneComponent {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  @Output() readonly fileSelected = new EventEmitter<File | null>();

  protected dragOver = false;
  protected fileName: string | null = null;

  protected onZoneClick(): void {
    this.openPicker();
  }

  protected onZoneKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPicker();
    }
  }

  protected openPicker(): void {
    this.fileInput?.nativeElement?.click();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    const f = event.dataTransfer?.files?.[0];
    if (f && f.type.startsWith('image/')) {
      this.setFile(f);
    }
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) {
      this.setFile(f);
    }
  }

  private setFile(file: File): void {
    this.fileName = file.name;
    this.fileSelected.emit(file);
  }

  /** Wywołaj po udanym uploadzie lub gdy trzeba wyczyścić wybór. */
  clear(): void {
    this.fileName = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.fileSelected.emit(null);
  }
}
