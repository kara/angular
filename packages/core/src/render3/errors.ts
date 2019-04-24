
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {TNode} from './interfaces/node';
import {LView, TVIEW} from './interfaces/view';
import {INTERPOLATION_DELIMITER, isPropMetadataString} from './util/misc_utils';

/** Called when directives inject each other (creating a circular dependency) */
export function throwCyclicDependencyError(token: any): never {
  throw new Error(`Cannot instantiate cyclic dependency! ${token}`);
}

/** Called when there are multiple component selectors that match a given node */
export function throwMultipleComponentError(tNode: TNode): never {
  throw new Error(`Multiple components match node with tagname ${tNode.tagName}`);
}

/** Throws an ExpressionChangedAfterChecked error if checkNoChanges mode is on. */
export function throwErrorIfNoChangesMode(
    creationMode: boolean, oldValue: any, currValue: any, lView: LView,
    bindingIndex: number): never|void {
  const bindingContext = ngDevMode ? generateBindingContext(lView, bindingIndex) : '';

  let msg =
      `ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. ${bindingContext}Previous value: '${oldValue}'. Current value: '${currValue}'.`;

  if (creationMode) {
    msg +=
        ` It seems like the view has been created after its parent and its children have been dirty checked.` +
        ` Has it been created in a change detection hook ?`;
  }
  // TODO: include debug context
  throw new Error(msg);
}

function generateBindingContext(lView: LView, bindingIndex: number): string {
  const maybePropertyString = lView[TVIEW].data[bindingIndex] as string;
  let propertyName = '';
  if (isPropMetadataString(maybePropertyString)) {
    const metadataParts = maybePropertyString.split(INTERPOLATION_DELIMITER);
    propertyName = metadataParts[0];
  }

  // TODO: We should also print attribute and class names here.
  return propertyName ? `Binding context: property binding to '${propertyName}'. ` : ` `;
}
