/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Type} from '../interface/type';
import {getClosureSafeProperty} from '../util/property';
import {stringify} from '../util/stringify';
import {resolveForwardRef} from './forward_ref';
import {InjectionToken} from './injection_token';
import {ɵɵinject, setCurrentInjector, injectArgs} from './injector_compatibility';
import {ɵɵdefineInjectable, InjectableType, InjectorType, InjectorTypeWithProviders, getInjectableDef, getInjectorDef, ɵɵInjectableDef} from './interface/defs';
import {InjectFlags} from './interface/injector';
import {
  ClassProvider,
  ConstructorProvider,
  ExistingProvider,
  FactoryProvider,
  StaticClassProvider,
  StaticProvider,
  TypeProvider,
  ValueProvider
} from './interface/provider';
import {Inject, Optional, Self, SkipSelf} from './metadata';
import {APP_ROOT} from './scope';
import {OnDestroy} from '../interface/lifecycle_hooks';

export const SOURCE = '__source';
const _THROW_IF_NOT_FOUND = new Object();
export const THROW_IF_NOT_FOUND = _THROW_IF_NOT_FOUND;

export function INJECTOR_IMPL__PRE_R3__(providers: any, parent: any, name: any) {
  return new StaticInjector(providers, parent, name);
}

export function INJECTOR_IMPL__POST_R3__(providers: any, parent: any, name: any) {
  return createInjector({}, parent, providers, name);
}

export const INJECTOR_IMPL = INJECTOR_IMPL__PRE_R3__;

/**
 * An InjectionToken that gets the current `Injector` for `createInjector()`-style injectors.
 *
 * Requesting this token instead of `Injector` allows `StaticInjector` to be tree-shaken from a
 * project.
 *
 * @publicApi
 */
export const INJECTOR = new InjectionToken<Injector>(
    'INJECTOR',
    -1 as any  // `-1` is used by Ivy DI system as special value to recognize it as `Injector`.
    );

export class NullInjector implements Injector {
  get(token: any, notFoundValue: any = _THROW_IF_NOT_FOUND): any {
    if (notFoundValue === _THROW_IF_NOT_FOUND) {
      // Intentionally left behind: With dev tools open the debugger will stop here. There is no
      // reason why correctly written application should cause this exception.
      // TODO(misko): uncomment the next line once `ngDevMode` works with closure.
      // if(ngDevMode) debugger;
      const error = new Error(`NullInjectorError: No provider for ${stringify(token)}!`);
      error.name = 'NullInjectorError';
      throw error;
    }
    return notFoundValue;
  }
}

/**
 * Concrete injectors implement this interface.
 *
 * For more details, see the ["Dependency Injection Guide"](guide/dependency-injection).
 *
 * @usageNotes
 * ### Example
 *
 * {@example core/di/ts/injector_spec.ts region='Injector'}
 *
 * `Injector` returns itself when given `Injector` as a token:
 *
 * {@example core/di/ts/injector_spec.ts region='injectInjector'}
 *
 * @publicApi
 */
export abstract class Injector {
  static THROW_IF_NOT_FOUND = _THROW_IF_NOT_FOUND;
  static NULL: Injector = new NullInjector();

  /**
   * Retrieves an instance from the injector based on the provided token.
   * @returns The instance from the injector if defined, otherwise the `notFoundValue`.
   * @throws When the `notFoundValue` is `undefined` or `Injector.THROW_IF_NOT_FOUND`.
   */
  abstract get<T>(token: Type<T>|InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T;
  /**
   * @deprecated from v4.0.0 use Type<T> or InjectionToken<T>
   * @suppress {duplicate}
   */
  abstract get(token: any, notFoundValue?: any): any;

  /**
   * @deprecated from v5 use the new signature Injector.create(options)
   */
  static create(providers: StaticProvider[], parent?: Injector): Injector;

  static create(options: {providers: StaticProvider[], parent?: Injector, name?: string}): Injector;

  /**
   * Create a new Injector which is configure using `StaticProvider`s.
   *
   * @usageNotes
   * ### Example
   *
   * {@example core/di/ts/provider_spec.ts region='ConstructorProvider'}
   */
  static create(
      options: StaticProvider[]|{providers: StaticProvider[], parent?: Injector, name?: string},
      parent?: Injector): Injector {
    if (Array.isArray(options)) {
      return INJECTOR_IMPL(options, parent, null);
    } else {
      return INJECTOR_IMPL(options.providers, options.parent, options.name || null);
    }
  }

  /** @nocollapse */
  static ngInjectableDef = ɵɵdefineInjectable({
    providedIn: 'any' as any,
    factory: () => ɵɵinject(INJECTOR),
  });

  /**
   * @internal
   * @nocollapse
   */
  static __NG_ELEMENT_ID__ = -1;
}





/**
 * Internal type for a single provider in a deep provider array.
 */
type SingleProvider = TypeProvider | ValueProvider | ClassProvider | ConstructorProvider |
  ExistingProvider | FactoryProvider | StaticClassProvider;

/**
 * Marker which indicates that a value has not yet been created from the factory function.
 */
const NOT_YET = {};

const IDENT = function<T>(value: T): T {
  return value;
};
/**
 * Marker which indicates that the factory function for a token is in the process of being called.
 *
 * If the injector is asked to inject a token with its value set to CIRCULAR, that indicates
 * injection of a dependency has recursively attempted to inject the original token, and there is
 * a circular dependency among the providers.
 */
const CIRCULAR = IDENT;

const EMPTY_ARRAY = [] as any[];

/**
 * A lazily initialized NullInjector.
 */
let NULL_INJECTOR_R3: Injector|undefined = undefined;

function getNullInjector(): Injector {
  if (NULL_INJECTOR === undefined) {
    NULL_INJECTOR_R3 = new NullInjector();
  }
  return NULL_INJECTOR_R3 !;
}

/**
 * An entry in the injector which tracks information about the given token, including a possible
 * current value.
 */
interface Record_R3<T> {
  factory: (() => T)|undefined;
  value: T|{};
  multi: any[]|undefined;
}

/**
 * Create a new `Injector` which is configured using a `defType` of `InjectorType<any>`s.
 *
 * @publicApi
 */
export function createInjector(
  defType: /* InjectorType<any> */ any, parent: Injector | null = null,
  additionalProviders: StaticProvider[] | null = null, name?: string): Injector {
  parent = parent || getNullInjector();
  return new R3Injector(defType, additionalProviders, parent, name);
}

export class R3Injector {
  /**
   * Map of tokens to records which contain the instances of those tokens.
   */
  private records = new Map<Type<any>|InjectionToken<any>, Record_R3<any>>();

  /**
   * The transitive set of `InjectorType`s which define this injector.
   */
  private injectorDefTypes = new Set<InjectorType<any>>();

  /**
   * Set of values instantiated by this injector which contain `ngOnDestroy` lifecycle hooks.
   */
  private onDestroy = new Set<OnDestroy>();

  /**
   * Flag indicating this injector provides the APP_ROOT_SCOPE token, and thus counts as the
   * root scope.
   */
  private readonly isRootInjector: boolean;

  readonly source: string|null;

  /**
   * Flag indicating that this injector was previously destroyed.
   */
  get destroyed(): boolean { return this._destroyed; }
  private _destroyed = false;

  constructor(
    def: InjectorType<any>, additionalProviders: StaticProvider[]|null, readonly parent: Injector,
    source: string|null = null) {
    // Start off by creating Records for every provider declared in every InjectorType
    // included transitively in `def`.
    const dedupStack: InjectorType<any>[] = [];
    deepForEach([def], injectorDef => this.processInjectorType(injectorDef, [], dedupStack));

    additionalProviders && deepForEach(
      additionalProviders, provider => this.processProvider(
        provider, def, additionalProviders));


    // Make sure the INJECTOR token provides this injector.
    this.records.set(INJECTOR, makeRecord(undefined, this));

    // Detect whether this injector has the APP_ROOT_SCOPE token and thus should provide
    // any injectable scoped to APP_ROOT_SCOPE.
    this.isRootInjector = this.records.has(APP_ROOT);

    // Eagerly instantiate the InjectorType classes themselves.
    this.injectorDefTypes.forEach(defType => this.get(defType));

    // Source name, used for debugging
    this.source = source || (def instanceof Array ? null : stringify(def));
  }

  /**
   * Destroy the injector and release references to every instance or provider associated with it.
   *
   * Also calls the `OnDestroy` lifecycle hooks of every instance that was created for which a
   * hook was found.
   */
  destroy(): void {
    this.assertNotDestroyed();

    // Set destroyed = true first, in case lifecycle hooks re-enter destroy().
    this._destroyed = true;
    try {
      // Call all the lifecycle hooks.
      this.onDestroy.forEach(service => service.ngOnDestroy());
    } finally {
      // Release all references.
      this.records.clear();
      this.onDestroy.clear();
      this.injectorDefTypes.clear();
    }
  }

  get<T>(
    token: Type<T>|InjectionToken<T>, notFoundValue: any = Injector.THROW_IF_NOT_FOUND,
    flags = InjectFlags.Default): T {
    this.assertNotDestroyed();
    // Set the injection context.
    const previousInjector = setCurrentInjector(this);
    try {
      // Check for the SkipSelf flag.
      if (!(flags & InjectFlags.SkipSelf)) {
        // SkipSelf isn't set, check if the record belongs to this injector.
        let record: Record_R3<T>|undefined = this.records.get(token);
        if (record === undefined) {
          // No record, but maybe the token is scoped to this injector. Look for an ngInjectableDef
          // with a scope matching this injector.
          const def = couldBeInjectableType(token) && getInjectableDef(token);
          if (def && this.injectableDefInScope(def)) {
            // Found an ngInjectableDef and it's scoped to this injector. Pretend as if it was here
            // all along.
            record = makeRecord(injectableDefOrInjectorDefFactory(token), NOT_YET);
            this.records.set(token, record);
          }
        }
        // If a record was found, get the instance for it and return it.
        if (record !== undefined) {
          return this.hydrate(token, record);
        }
      }

      // Select the next injector based on the Self flag - if self is set, the next injector is
      // the NullInjector, otherwise it's the parent.
      const nextInjector = !(flags & InjectFlags.Self) ? this.parent : getNullInjector();
      return nextInjector.get(token, flags & InjectFlags.Optional ? null : notFoundValue);
    } catch (e) {
      if (e.name === 'NullInjectorError') {
        const path: any[] = e[NG_TEMP_TOKEN_PATH] = e[NG_TEMP_TOKEN_PATH] || [];
        path.unshift(stringify(token));
        if (previousInjector) {
          // We still have a parent injector, keep throwing
          throw e;
        } else {
          // Format & throw the final error message when we don't have any previous injector
          return catchInjectorError(e, token, 'R3InjectorError', this.source);
        }
      } else {
        throw e;
      }
    } finally {
      // Lastly, clean up the state by restoring the previous injector.
      setCurrentInjector(previousInjector);
    }
  }

  private assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('Injector has already been destroyed.');
    }
  }

  /**
   * Add an `InjectorType` or `InjectorDefTypeWithProviders` and all of its transitive providers
   * to this injector.
   */
  private processInjectorType(
    defOrWrappedDef: InjectorType<any>|InjectorTypeWithProviders<any>,
    parents: InjectorType<any>[], dedupStack: InjectorType<any>[]) {
    defOrWrappedDef = resolveForwardRef(defOrWrappedDef);
    if (!defOrWrappedDef) return;

    // Either the defOrWrappedDef is an InjectorType (with ngInjectorDef) or an
    // InjectorDefTypeWithProviders (aka ModuleWithProviders). Detecting either is a megamorphic
    // read, so care is taken to only do the read once.

    // First attempt to read the ngInjectorDef.
    let def = getInjectorDef(defOrWrappedDef);

    // If that's not present, then attempt to read ngModule from the InjectorDefTypeWithProviders.
    const ngModule =
      (def == null) && (defOrWrappedDef as InjectorTypeWithProviders<any>).ngModule || undefined;

    // Determine the InjectorType. In the case where `defOrWrappedDef` is an `InjectorType`,
    // then this is easy. In the case of an InjectorDefTypeWithProviders, then the definition type
    // is the `ngModule`.
    const defType: InjectorType<any> =
      (ngModule === undefined) ? (defOrWrappedDef as InjectorType<any>) : ngModule;

    // Check for circular dependencies.
    if (ngDevMode && parents.indexOf(defType) !== -1) {
      const defName = stringify(defType);
      throw new Error(
        `Circular dependency in DI detected for type ${defName}. Dependency path: ${parents.map(defType => stringify(defType)).join(' > ')} > ${defName}.`);
    }

    // Check for multiple imports of the same module
    const isDuplicate = dedupStack.indexOf(defType) !== -1;

    // If defOrWrappedType was an InjectorDefTypeWithProviders, then .providers may hold some
    // extra providers.
    const providers =
      (ngModule !== undefined) && (defOrWrappedDef as InjectorTypeWithProviders<any>).providers ||
      EMPTY_ARRAY;

    // Finally, if defOrWrappedType was an `InjectorDefTypeWithProviders`, then the actual
    // `InjectorDef` is on its `ngModule`.
    if (ngModule !== undefined) {
      def = getInjectorDef(ngModule);
    }

    // If no definition was found, it might be from exports. Remove it.
    if (def == null) {
      return;
    }

    // Track the InjectorType and add a provider for it.
    this.injectorDefTypes.add(defType);
    this.records.set(defType, makeRecord(def.factory, NOT_YET));

    // Add providers in the same way that @NgModule resolution did:

    // First, include providers from any imports.
    if (def.imports != null && !isDuplicate) {
      // Before processing defType's imports, add it to the set of parents. This way, if it ends
      // up deeply importing itself, this can be detected.
      ngDevMode && parents.push(defType);
      // Add it to the set of dedups. This way we can detect multiple imports of the same module
      dedupStack.push(defType);

      try {
        deepForEach(
          def.imports, imported => this.processInjectorType(imported, parents, dedupStack));
      } finally {
        // Remove it from the parents set when finished.
        ngDevMode && parents.pop();
      }
    }

    // Next, include providers listed on the definition itself.
    const defProviders = def.providers;
    if (defProviders != null && !isDuplicate) {
      const injectorType = defOrWrappedDef as InjectorType<any>;
      deepForEach(
        defProviders, provider => this.processProvider(provider, injectorType, defProviders));
    }

    // Finally, include providers from an InjectorDefTypeWithProviders if there was one.
    const ngModuleType = (defOrWrappedDef as InjectorTypeWithProviders<any>).ngModule;
    deepForEach(providers, provider => this.processProvider(provider, ngModuleType, providers));
  }

  /**
   * Process a `SingleProvider` and add it.
   */
  private processProvider(
    provider: SingleProvider, ngModuleType: InjectorType<any>, providers: any[]): void {
    // Determine the token from the provider. Either it's its own token, or has a {provide: ...}
    // property.
    provider = resolveForwardRef(provider);
    let token: any =
      isTypeProvider(provider) ? provider : resolveForwardRef(provider && provider.provide);

    // Construct a `Record` for the provider.
    const record = providerToRecord(provider, ngModuleType, providers);

    if (!isTypeProvider(provider) && provider.multi === true) {
      // If the provider indicates that it's a multi-provider, process it specially.
      // First check whether it's been defined already.
      let multiRecord = this.records.get(token);
      if (multiRecord) {
        // It has. Throw a nice error if
        if (multiRecord.multi === undefined) {
          throw new Error(`Mixed multi-provider for ${token}.`);
        }
      } else {
        multiRecord = makeRecord(undefined, NOT_YET, true);
        multiRecord.factory = () => injectArgs(multiRecord !.multi !);
        this.records.set(token, multiRecord);
      }
      token = provider;
      multiRecord.multi !.push(provider);
    } else {
      const existing = this.records.get(token);
      if (existing && existing.multi !== undefined) {
        throw new Error(`Mixed multi-provider for ${stringify(token)}`);
      }
    }
    this.records.set(token, record);
  }

  private hydrate<T>(token: Type<T>|InjectionToken<T>, record: Record_R3<T>): T {
    if (record.value === CIRCULAR) {
      throw new Error(`Cannot instantiate cyclic dependency! ${stringify(token)}`);
    } else if (record.value === NOT_YET) {
      record.value = CIRCULAR;
      record.value = record.factory !();
    }
    if (typeof record.value === 'object' && record.value && hasOnDestroy(record.value)) {
      this.onDestroy.add(record.value);
    }
    return record.value as T;
  }

  private injectableDefInScope(def: ɵɵInjectableDef<any>): boolean {
    if (!def.providedIn) {
      return false;
    } else if (typeof def.providedIn === 'string') {
      return def.providedIn === 'any' || (def.providedIn === 'root' && this.isRootInjector);
    } else {
      return this.injectorDefTypes.has(def.providedIn);
    }
  }
}

function injectableDefOrInjectorDefFactory(token: Type<any>| InjectionToken<any>): () => any {
  const injectableDef = getInjectableDef(token as InjectableType<any>);
  if (injectableDef === null) {
    const injectorDef = getInjectorDef(token as InjectorType<any>);
    if (injectorDef !== null) {
      return injectorDef.factory;
    } else if (token instanceof InjectionToken) {
      throw new Error(`Token ${stringify(token)} is missing an ngInjectableDef definition.`);
    } else if (token instanceof Function) {
      const paramLength = token.length;
      if (paramLength > 0) {
        const args: string[] = new Array(paramLength).fill('?');
        throw new Error(
          `Can't resolve all parameters for ${stringify(token)}: (${args.join(', ')}).`);
      }
      return () => new (token as Type<any>)();
    }
    throw new Error('unreachable');
  }
  return injectableDef.factory;
}

function providerToRecord(
  provider: SingleProvider, ngModuleType: InjectorType<any>, providers: any[]): Record_R3<any> {
  let factory: (() => any)|undefined = providerToFactory(provider, ngModuleType, providers);
  if (isValueProvider(provider)) {
    return makeRecord(undefined, provider.useValue);
  } else {
    return makeRecord(factory, NOT_YET);
  }
}

/**
 * Converts a `SingleProvider` into a factory function.
 *
 * @param provider provider to convert to factory
 */
export function providerToFactory(
  provider: SingleProvider, ngModuleType?: InjectorType<any>, providers?: any[]): () => any {
  let factory: (() => any)|undefined = undefined;
  if (isTypeProvider(provider)) {
    return injectableDefOrInjectorDefFactory(resolveForwardRef(provider));
  } else {
    if (isValueProvider(provider)) {
      factory = () => resolveForwardRef(provider.useValue);
    } else if (isExistingProvider(provider)) {
      factory = () => ɵɵinject(resolveForwardRef(provider.useExisting));
    } else if (isFactoryProvider(provider)) {
      factory = () => provider.useFactory(...injectArgs(provider.deps || []));
    } else {
      const classRef = resolveForwardRef(
        provider &&
        ((provider as StaticClassProvider | ClassProvider).useClass || provider.provide));
      if (!classRef) {
        let ngModuleDetail = '';
        if (ngModuleType && providers) {
          const providerDetail = providers.map(v => v == provider ? '?' + provider + '?' : '...');
          ngModuleDetail =
            ` - only instances of Provider and Type are allowed, got: [${providerDetail.join(', ')}]`;
        }
        throw new Error(
          `Invalid provider for the NgModule '${stringify(ngModuleType)}'` + ngModuleDetail);
      }
      if (hasDeps(provider)) {
        factory = () => new (classRef)(...injectArgs(provider.deps));
      } else {
        return injectableDefOrInjectorDefFactory(classRef);
      }
    }
  }
  return factory;
}

function makeRecord<T>(
  factory: (() => T) | undefined, value: T | {}, multi: boolean = false): Record_R3<T> {
  return {
    factory: factory,
    value: value,
    multi: multi ? [] : undefined,
  };
}

function deepForEach<T>(input: (T | any[])[], fn: (value: T) => void): void {
  input.forEach(value => Array.isArray(value) ? deepForEach(value, fn) : fn(value));
}

function isValueProvider(value: SingleProvider): value is ValueProvider {
  return value !== null && typeof value == 'object' && USE_VALUE in value;
}

function isExistingProvider(value: SingleProvider): value is ExistingProvider {
  return !!(value && (value as ExistingProvider).useExisting);
}

function isFactoryProvider(value: SingleProvider): value is FactoryProvider {
  return !!(value && (value as FactoryProvider).useFactory);
}

export function isTypeProvider(value: SingleProvider): value is TypeProvider {
  return typeof value === 'function';
}

export function isClassProvider(value: SingleProvider): value is ClassProvider {
  return !!(value as StaticClassProvider | ClassProvider).useClass;
}

function hasDeps(value: ClassProvider | ConstructorProvider | StaticClassProvider):
  value is ClassProvider&{deps: any[]} {
  return !!(value as any).deps;
}

function hasOnDestroy(value: any): value is OnDestroy {
  return value !== null && typeof value === 'object' &&
    typeof(value as OnDestroy).ngOnDestroy === 'function';
}

function couldBeInjectableType(value: any): value is Type<any>|InjectionToken<any> {
  return (typeof value === 'function') ||
    (typeof value === 'object' && value instanceof InjectionToken);
}

const EMPTY = <any[]>[];
const MULTI_PROVIDER_FN = function(): any[] {
  return Array.prototype.slice.call(arguments);
};
export const USE_VALUE =
    getClosureSafeProperty<ValueProvider>({provide: String, useValue: getClosureSafeProperty});
const NG_TOKEN_PATH = 'ngTokenPath';
export const NG_TEMP_TOKEN_PATH = 'ngTempTokenPath';
const enum OptionFlags {
  Optional = 1 << 0,
  CheckSelf = 1 << 1,
  CheckParent = 1 << 2,
  Default = CheckSelf | CheckParent
}
const NULL_INJECTOR = Injector.NULL;
const NEW_LINE = /\n/gm;
const NO_NEW_LINE = 'ɵ';

export class StaticInjector implements Injector {
  readonly parent: Injector;
  readonly source: string|null;

  private _records: Map<any, Record>;

  constructor(
      providers: StaticProvider[], parent: Injector = NULL_INJECTOR, source: string|null = null) {
    this.parent = parent;
    this.source = source;
    const records = this._records = new Map<any, Record>();
    records.set(
        Injector, <Record>{token: Injector, fn: IDENT, deps: EMPTY, value: this, useNew: false});
    records.set(
        INJECTOR, <Record>{token: INJECTOR, fn: IDENT, deps: EMPTY, value: this, useNew: false});
    recursivelyProcessProviders(records, providers);
  }

  get<T>(token: Type<T>|InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T;
  get(token: any, notFoundValue?: any): any;
  get(token: any, notFoundValue?: any, flags: InjectFlags = InjectFlags.Default): any {
    const record = this._records.get(token);
    try {
      return tryResolveToken(token, record, this._records, this.parent, notFoundValue, flags);
    } catch (e) {
      return catchInjectorError(e, token, 'StaticInjectorError', this.source);
    }
  }

  toString() {
    const tokens = <string[]>[], records = this._records;
    records.forEach((v, token) => tokens.push(stringify(token)));
    return `StaticInjector[${tokens.join(', ')}]`;
  }
}

type SupportedProvider =
    ValueProvider | ExistingProvider | StaticClassProvider | ConstructorProvider | FactoryProvider;

interface Record {
  fn: Function;
  useNew: boolean;
  deps: DependencyRecord[];
  value: any;
}

interface DependencyRecord {
  token: any;
  options: number;
}

function resolveProvider(provider: SupportedProvider): Record {
  const deps = computeDeps(provider);
  let fn: Function = IDENT;
  let value: any = EMPTY;
  let useNew: boolean = false;
  let provide = resolveForwardRef(provider.provide);
  if (USE_VALUE in provider) {
    // We need to use USE_VALUE in provider since provider.useValue could be defined as undefined.
    value = (provider as ValueProvider).useValue;
  } else if ((provider as FactoryProvider).useFactory) {
    fn = (provider as FactoryProvider).useFactory;
  } else if ((provider as ExistingProvider).useExisting) {
    // Just use IDENT
  } else if ((provider as StaticClassProvider).useClass) {
    useNew = true;
    fn = resolveForwardRef((provider as StaticClassProvider).useClass);
  } else if (typeof provide == 'function') {
    useNew = true;
    fn = provide;
  } else {
    throw staticError(
        'StaticProvider does not have [useValue|useFactory|useExisting|useClass] or [provide] is not newable',
        provider);
  }
  return {deps, fn, useNew, value};
}

function multiProviderMixError(token: any) {
  return staticError('Cannot mix multi providers and regular providers', token);
}

function recursivelyProcessProviders(records: Map<any, Record>, provider: StaticProvider) {
  if (provider) {
    provider = resolveForwardRef(provider);
    if (provider instanceof Array) {
      // if we have an array recurse into the array
      for (let i = 0; i < provider.length; i++) {
        recursivelyProcessProviders(records, provider[i]);
      }
    } else if (typeof provider === 'function') {
      // Functions were supported in ReflectiveInjector, but are not here. For safety give useful
      // error messages
      throw staticError('Function/Class not supported', provider);
    } else if (provider && typeof provider === 'object' && provider.provide) {
      // At this point we have what looks like a provider: {provide: ?, ....}
      let token = resolveForwardRef(provider.provide);
      const resolvedProvider = resolveProvider(provider);
      if (provider.multi === true) {
        // This is a multi provider.
        let multiProvider: Record|undefined = records.get(token);
        if (multiProvider) {
          if (multiProvider.fn !== MULTI_PROVIDER_FN) {
            throw multiProviderMixError(token);
          }
        } else {
          // Create a placeholder factory which will look up the constituents of the multi provider.
          records.set(token, multiProvider = <Record>{
            token: provider.provide,
            deps: [],
            useNew: false,
            fn: MULTI_PROVIDER_FN,
            value: EMPTY
          });
        }
        // Treat the provider as the token.
        token = provider;
        multiProvider.deps.push({token, options: OptionFlags.Default});
      }
      const record = records.get(token);
      if (record && record.fn == MULTI_PROVIDER_FN) {
        throw multiProviderMixError(token);
      }
      records.set(token, resolvedProvider);
    } else {
      throw staticError('Unexpected provider', provider);
    }
  }
}

function tryResolveToken(
    token: any, record: Record | undefined, records: Map<any, Record>, parent: Injector,
    notFoundValue: any, flags: InjectFlags): any {
  try {
    return resolveToken(token, record, records, parent, notFoundValue, flags);
  } catch (e) {
    // ensure that 'e' is of type Error.
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    const path: any[] = e[NG_TEMP_TOKEN_PATH] = e[NG_TEMP_TOKEN_PATH] || [];
    path.unshift(token);
    if (record && record.value == CIRCULAR) {
      // Reset the Circular flag.
      record.value = EMPTY;
    }
    throw e;
  }
}

function resolveToken(
    token: any, record: Record | undefined, records: Map<any, Record>, parent: Injector,
    notFoundValue: any, flags: InjectFlags): any {
  let value;
  if (record && !(flags & InjectFlags.SkipSelf)) {
    // If we don't have a record, this implies that we don't own the provider hence don't know how
    // to resolve it.
    value = record.value;
    if (value == CIRCULAR) {
      throw Error(NO_NEW_LINE + 'Circular dependency');
    } else if (value === EMPTY) {
      record.value = CIRCULAR;
      let obj = undefined;
      let useNew = record.useNew;
      let fn = record.fn;
      let depRecords = record.deps;
      let deps = EMPTY;
      if (depRecords.length) {
        deps = [];
        for (let i = 0; i < depRecords.length; i++) {
          const depRecord: DependencyRecord = depRecords[i];
          const options = depRecord.options;
          const childRecord =
              options & OptionFlags.CheckSelf ? records.get(depRecord.token) : undefined;
          deps.push(tryResolveToken(
              // Current Token to resolve
              depRecord.token,
              // A record which describes how to resolve the token.
              // If undefined, this means we don't have such a record
              childRecord,
              // Other records we know about.
              records,
              // If we don't know how to resolve dependency and we should not check parent for it,
              // than pass in Null injector.
              !childRecord && !(options & OptionFlags.CheckParent) ? NULL_INJECTOR : parent,
              options & OptionFlags.Optional ? null : Injector.THROW_IF_NOT_FOUND,
              InjectFlags.Default));
        }
      }
      record.value = value = useNew ? new (fn as any)(...deps) : fn.apply(obj, deps);
    }
  } else if (!(flags & InjectFlags.Self)) {
    value = parent.get(token, notFoundValue, InjectFlags.Default);
  }
  return value;
}

function computeDeps(provider: StaticProvider): DependencyRecord[] {
  let deps: DependencyRecord[] = EMPTY;
  const providerDeps: any[] =
      (provider as ExistingProvider & StaticClassProvider & ConstructorProvider).deps;
  if (providerDeps && providerDeps.length) {
    deps = [];
    for (let i = 0; i < providerDeps.length; i++) {
      let options = OptionFlags.Default;
      let token = resolveForwardRef(providerDeps[i]);
      if (token instanceof Array) {
        for (let j = 0, annotations = token; j < annotations.length; j++) {
          const annotation = annotations[j];
          if (annotation instanceof Optional || annotation == Optional) {
            options = options | OptionFlags.Optional;
          } else if (annotation instanceof SkipSelf || annotation == SkipSelf) {
            options = options & ~OptionFlags.CheckSelf;
          } else if (annotation instanceof Self || annotation == Self) {
            options = options & ~OptionFlags.CheckParent;
          } else if (annotation instanceof Inject) {
            token = (annotation as Inject).token;
          } else {
            token = resolveForwardRef(annotation);
          }
        }
      }
      deps.push({token, options});
    }
  } else if ((provider as ExistingProvider).useExisting) {
    const token = resolveForwardRef((provider as ExistingProvider).useExisting);
    deps = [{token, options: OptionFlags.Default}];
  } else if (!providerDeps && !(USE_VALUE in provider)) {
    // useValue & useExisting are the only ones which are exempt from deps all others need it.
    throw staticError('\'deps\' required', provider);
  }
  return deps;
}

export function catchInjectorError(
    e: any, token: any, injectorErrorName: string, source: string | null): never {
  const tokenPath: any[] = e[NG_TEMP_TOKEN_PATH];
  if (token[SOURCE]) {
    tokenPath.unshift(token[SOURCE]);
  }
  e.message = formatError('\n' + e.message, tokenPath, injectorErrorName, source);
  e[NG_TOKEN_PATH] = tokenPath;
  e[NG_TEMP_TOKEN_PATH] = null;
  throw e;
}

function formatError(
    text: string, obj: any, injectorErrorName: string, source: string | null = null): string {
  text = text && text.charAt(0) === '\n' && text.charAt(1) == NO_NEW_LINE ? text.substr(2) : text;
  let context = stringify(obj);
  if (obj instanceof Array) {
    context = obj.map(stringify).join(' -> ');
  } else if (typeof obj === 'object') {
    let parts = <string[]>[];
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        let value = obj[key];
        parts.push(
            key + ':' + (typeof value === 'string' ? JSON.stringify(value) : stringify(value)));
      }
    }
    context = `{${parts.join(', ')}}`;
  }
  return `${injectorErrorName}${source ? '(' + source + ')' : ''}[${context}]: ${text.replace(NEW_LINE, '\n  ')}`;
}

function staticError(text: string, obj: any): Error {
  return new Error(formatError(text, obj, 'StaticInjectorError'));
}
