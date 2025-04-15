import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy',
  standalone: true,
})
export class OrderByPipe implements PipeTransform {
  transform(array: any[], field: string): any[] {
    if (!array || !field) {
      return array;
    }

    return array.sort((a, b) => {
      const aValue = a[field]?.toLowerCase() || '';
      const bValue = b[field]?.toLowerCase() || '';
      return aValue.localeCompare(bValue, 'es', { sensitivity: 'base' });
    });
  }
}
