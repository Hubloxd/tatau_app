import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-photo-dropzone',
  standalone: true,
  imports: [NgClass],
  templateUrl: './photo-dropzone.html',
})
export class PhotoDropzoneComponent implements OnDestroy {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  /** Przy „false” nie tworzymy podglądu (np. awatar obok osobnej miniaturki). */
  @Input() showImagePreview = true;

  /** Dla awatara ustaw np. `"image/*"`. */
  @Input() accept = 'image/*,video/mp4,video/webm,video/quicktime,video/ogg';

  @Output() readonly fileSelected = new EventEmitter<File | null>();

  protected dragOver = false;
  protected fileName: string | null = null;
  protected previewUrl: string | null = null;
  protected previewIsVideo = false;

  private previewObjectUrl: string | null = null;

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
    if (f && this.isAllowedMediaType(f)) {
      this.setFile(f);
    }
  }

  private isAllowedMediaType(file: File): boolean {
    const t = file.type;
    return t.startsWith('image/') || t.startsWith('video/');
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f && this.isAllowedMediaType(f)) {
      this.setFile(f);
    }
  }

  private setFile(file: File): void {
    this.releasePreview();
    this.fileName = file.name;
    this.previewIsVideo = file.type.startsWith('video/');
    if (this.showImagePreview && typeof URL !== 'undefined') {
      this.previewObjectUrl = URL.createObjectURL(file);
      this.previewUrl = this.previewObjectUrl;
    }
    this.fileSelected.emit(file);
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  private releasePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl = null;
    this.previewIsVideo = false;
  }

  /** Wywołaj po udanym uploadzie lub gdy trzeba wyczyścić wybór. */
  clear(): void {
    this.releasePreview();
    this.fileName = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.fileSelected.emit(null);
  }
}
