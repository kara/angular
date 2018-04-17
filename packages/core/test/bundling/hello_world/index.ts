/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Component, NgModule, ɵrenderComponent as renderComponent} from '@angular/core';

@Component({selector: 'hello-world', template: '<div>Hello, {{ name }}!</div>'})
export class HelloWorld {
  name = 'World!';
}

@NgModule({declarations: [HelloWorld]})
export class AppModule {}

renderComponent(HelloWorld);
