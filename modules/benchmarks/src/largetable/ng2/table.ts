/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component, Input, NgModule} from '@angular/core';
import {BrowserModule, DomSanitizer, SafeStyle} from '@angular/platform-browser';

import {TableCell, emptyTable} from '../util';

@Component({
  selector: 'largetable',
  template: `<table><tbody>
    <tr *ngFor="let row of data">
      <td *ngFor="let cell of row">
      {{cell.value}}
      </td>
    </tr>
  </tbody></table>`,
})
export class TableComponent {
  @Input()
  data: TableCell[][] = emptyTable;
}

@NgModule({imports: [BrowserModule], bootstrap: [TableComponent], declarations: [TableComponent]})
export class AppModule {
}
