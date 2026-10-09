import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stock-status',
  template: `
    @if (!active()) {
      <span class="muted">Inactive</span>
    } @else if (quantity() === 0) {
      <strong class="error">Out of stock</strong>
    } @else if (quantity() <= reorderLevel()) {
      <strong class="warning">Low stock</strong>
    } @else {
      <span>In stock</span>
    }
  `,
  styles: `
    .warning {
      color: #805000;
    }
  `,
})
export class StockStatus {
  readonly quantity = input.required<number>();
  readonly reorderLevel = input.required<number>();
  readonly active = input(true);
}
