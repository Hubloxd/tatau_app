import { Pipe, PipeTransform } from '@angular/core';
import { userTypeLabelPl } from '../util/user-type-label';

@Pipe({
  name: 'userTypeLabel',
  standalone: true,
})
export class UserTypeLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return userTypeLabelPl(value);
  }
}
