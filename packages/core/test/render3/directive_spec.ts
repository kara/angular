/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {defineDirective} from '../../src/render3/index';
import {bind, elementEnd, elementProperty, elementStart, loadDirective} from '../../src/render3/instructions';

import {renderToHtml} from './render_util';

describe('directive', () => {

  describe('host', () => {

    it('should support host bindings in directives', () => {
      let directiveInstance: Directive|undefined;

      class Directive {
        klass = 'foo';
        static ngDirectiveDef = defineDirective({
          type: Directive,
          factory: () => directiveInstance = new Directive,
          hostBindings: (directiveIndex: number, elementIndex: number) => {
            elementProperty(
                elementIndex, 'className', bind(loadDirective<Directive>(directiveIndex).klass));
          }
        });
      }

      function Template(ctx: any, cm: boolean) {
        if (cm) {
          elementStart(0, 'span', null, [Directive]);
          elementEnd();
        }
      }

      expect(renderToHtml(Template, {})).toEqual('<span class="foo"></span>');
      directiveInstance !.klass = 'bar';
      expect(renderToHtml(Template, {})).toEqual('<span class="bar"></span>');
    });

  });
});
