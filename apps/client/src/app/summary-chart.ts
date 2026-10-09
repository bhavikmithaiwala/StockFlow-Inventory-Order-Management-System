import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-summary-chart',
  template: `
    <figure class="panel">
      <figcaption>
        <h3>{{ title() }}</h3>
      </figcaption>
      <ul>
        @for (item of data(); track item.label) {
          <li>
            <span
              >{{ item.label }}: <strong>{{ item.value }}</strong></span
            ><meter
              min="0"
              [max]="maximum()"
              [value]="item.value"
              [attr.aria-label]="item.label + ': ' + item.value"
            >
              {{ item.value }}
            </meter>
          </li>
        } @empty {
          <li>No records available yet.</li>
        }
      </ul>
    </figure>
  `,
  styles: `
    figure {
      margin-left: 0;
      margin-right: 0;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      margin: 0.6rem 0;
    }
    meter {
      display: block;
      width: 100%;
      height: 1.5rem;
    }
  `,
})
export class SummaryChart {
  readonly title = input.required<string>();
  readonly data = input.required<{ label: string; value: number }[]>();
  readonly maximum = computed(() => Math.max(1, ...this.data().map((item) => item.value)));
}
