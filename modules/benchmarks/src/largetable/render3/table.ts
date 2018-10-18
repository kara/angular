/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ɵRenderFlags, Input, ɵdetectChanges, Component, NgModule, ViewEncapsulation, ɵrenderComponent as renderComponent} from '@angular/core';
import {ComponentDef} from '@angular/core/src/render3/interfaces/definition';

import {TableCell, buildTable, emptyTable} from '../util';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'largetable',
  template: `
    <table>
      <tbody>
        <tr *ngFor="let row of data">
          <td *ngFor="let cell of row">
            {{cell.value}}
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
export class LargeTableComponent {
  @Input()
  data: TableCell[][] = emptyTable;
}

@NgModule({declarations: [LargeTableComponent], imports: [CommonModule]})
class TableModule {
}


export function destroyDom(component: LargeTableComponent) {
  component.data = emptyTable;
  ɵdetectChanges(component);
}

export function createDom(component: LargeTableComponent) {
  component.data = buildTable();
  ɵdetectChanges(component);
}
