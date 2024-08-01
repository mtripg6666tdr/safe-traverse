// eslint-disable-next-line @typescript-eslint/ban-types
type StringLiteralOrOther<T> = T | (string & {});

type SafeTraverseStateGetResult<BaseObject, ExpectedReturnType, PropertyName extends PropertyKey, Proxified extends boolean> =
  BaseObject extends { [key in PropertyName]: ExpectedReturnType }
    ? Proxified extends true
      ? ProxifiedSafeTraverseState<BaseObject[PropertyName]>
      : SafeTraverseState<BaseObject[PropertyName]>
    : Proxified extends true
      ? ProxifiedSafeTraverseState<ExpectedReturnType>
      : SafeTraverseState<ExpectedReturnType>;

type SafeTraverseStateGetResultPromise<BaseObject, ExpectedReturnType, PropertyName extends PropertyKey, Proxified extends boolean> =
      BaseObject extends { [key in PropertyName]: ExpectedReturnType }
        ? Proxified extends true
          ? ProxifiedSafeTraverseState<BaseObject[PropertyName]>
          : SafeTraverseStatePromise<BaseObject[PropertyName]>
        : Proxified extends true
          ? ProxifiedSafeTraverseState<ExpectedReturnType>
          : SafeTraverseStatePromise<ExpectedReturnType>;

interface BaseSafeTraverseStateGet<T> {
  (): T;
  <U = any, V extends StringLiteralOrOther<keyof T> = keyof T>(name: V): SafeTraverseStateGetResult<T, U, V, false>;
}

interface BaseSafeTraverseStateGetPromise<T> {
  (): Promise<T>;
  <U = any, V extends StringLiteralOrOther<keyof T> = keyof T>(name: V): SafeTraverseStateGetResultPromise<T, U, V, false>;
}

interface BaseSafeTraverseStateExecute<T> {
  <FunctionName extends StringLiteralOrOther<keyof T>>(
    func: FunctionName,
    ...args: T extends undefined
      ? any[]
      : T extends { [key in FunctionName]: (...args: any[]) => any }
        ? Parameters<T[FunctionName]>
        : any[]
  ): T extends undefined
    ? SafeTraverseState<undefined>
    : T extends { [key in FunctionName]: (...args: any[]) => any }
      ? SafeTraverseState<ReturnType<T[FunctionName]>>
      : SafeTraverseState<unknown>;
  (func: string, ...args: any[]): SafeTraverseState<unknown>;
}

interface BaseSafeTraverseStateExecutePromise<T> {
  <FunctionName extends StringLiteralOrOther<keyof T>>(
    func: FunctionName,
    ...args: T extends undefined
      ? any[]
      : T extends { [key in FunctionName]: (...args: any[]) => any }
        ? Parameters<T[FunctionName]>
        : any[]
  ): SafeTraverseStatePromise<
      T extends undefined
      ? SafeTraverseState<undefined>
      : T extends { [key in FunctionName]: (...args: any[]) => any }
        ? SafeTraverseState<ReturnType<T[FunctionName]>>
        : SafeTraverseState<unknown>
  >;
  (func: string, ...args: any[]): SafeTraverseState<unknown>;
}

interface BaseSafeTraverseState<T>{
  path: string;
  get value(): T;
  error?: any;
  getProperty: <ExpectedReturn = any, PropertyName extends StringLiteralOrOther<keyof T> = keyof T>(name: PropertyName) => SafeTraverseStateGetResult<T, ExpectedReturn, PropertyName, false>;
  get: BaseSafeTraverseStateGet<T>;
  select: <ExpectedReturn = any>(selector: (current: T) => ExpectedReturn | undefined | null) => SafeTraverseState<ExpectedReturn | undefined>;
  call: BaseSafeTraverseStateExecute<T>;
  safeCall: BaseSafeTraverseStateExecute<T>;
  action: (action: (value: T) => void) => SafeTraverseState<T>;
  validate: (validator: (value: T) => boolean) => SafeTraverseState<T> | SafeTraverseState<undefined>;
  keys: () => SafeTraverseState<StringLiteralOrOther<keyof T>[]>;
  values: () => SafeTraverseState<any[]>;
  entries: () => SafeTraverseState<([keyof T, T[keyof T]] | [string, any])[]>;
}

interface SafeTraverseStatePromise<T> extends Promise<SafeTraverseState<T>> {
  thenExpect: <U> (invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => SafeTraverseStatePromise<Awaited<U>>;
  thenSafeExpect: <U> (invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => SafeTraverseStatePromise<Awaited<U>>;
  thenGetProperty: <ExpectedReturn = any, PropertyName extends StringLiteralOrOther<keyof T> = keyof T>(name: PropertyName) => SafeTraverseStateGetResultPromise<T, ExpectedReturn, PropertyName, false>;
  thenGet: BaseSafeTraverseStateGetPromise<T>;
  thenAction: (action: (value: T) => void) => SafeTraverseStatePromise<T>;
  thenCall: BaseSafeTraverseStateExecutePromise<T>;
  thenSafeCall: BaseSafeTraverseStateExecutePromise<T>;
  thenSelect: <U = any>(selector: (current: T) => U | undefined | null) => SafeTraverseStatePromise<U | undefined>;
  thenValidate: (validator: (value: T) => boolean) => SafeTraverseStatePromise<T | undefined>;
  get thenValue(): Promise<T>;
}

interface SafeTraverseState<T> extends BaseSafeTraverseState<T> {
  expect: <U> (invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => SafeTraverseState<U>;
  safeExpect: <U> (invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => SafeTraverseState<U>;
  async: (failSafe?: boolean) => SafeTraverseStatePromise<Awaited<T>>;
}

const INTERNAL = Symbol("INTERNAL");
type INTERNAL = typeof INTERNAL;

type ProxifiedSafeTraverseState<T> = {
  [INTERNAL]: BaseSafeTraverseState<T>;
} & {
  [key in Exclude<StringLiteralOrOther<keyof T>, INTERNAL>]: SafeTraverseStateGetResult<T, any, key, true>;
} & (
  T extends (...args: any[]) => any
    ? (...args: Parameters<T>) => ProxifiedSafeTraverseState<ReturnType<T>>
    : {}
);

function safeTraverseFrom<S>(obj: S): SafeTraverseState<S> {
  const createState: <T = any, P extends boolean = false> (value: T, path: string, proxy: P, proxifiedSafeCall?: boolean) => P extends true ? ProxifiedSafeTraverseState<T> : SafeTraverseState<T> =
    <T = any, P extends boolean = false> (value: T, path: string, proxy: P, proxifiedSafeCall = false) => {
    const unproxifiedResult = {
      path,
      get value(){
        return value;
      },
      getProperty: <V extends StringLiteralOrOther<keyof T> = string>(name: V) => value
        ?  value[name as keyof NonNullable<T>] !== undefined
          ? createState(value[name as keyof NonNullable<T>], `${path}.${String(name)}`, proxy, proxifiedSafeCall) as SafeTraverseStateGetResult<T, any, V, P>
          : undefinedState(proxy, `${path}.${String(name)}`)
        : undefinedState(proxy, path),
      get: (...name: string[]) => name.length === 1 ? unproxifiedResult.getProperty(name[0]) : value,
      select: <U = any>(selector: (current: T) => U | undefined | null) => value
        ? createState<U | undefined, boolean>(selector(value) || undefined, `${path}.(selector)`, proxy, proxifiedSafeCall)
        : undefinedState(proxy, path),
      call: <U extends StringLiteralOrOther<keyof T>>(
        func: U,
        ...args: T extends undefined
          ? any[]
          : T extends { [key in U]: (...args: any[]) => any }
            ? [...Parameters<T[U]>]
            : any[]
      ) => value
        ? typeof value[func as keyof NonNullable<T>] === "function"
        // @ts-expect-error
          ? createState(value[func as keyof NonNullable<T>](...args), `${path}.#${String(func)}`, proxy, proxifiedSafeCall)
          : undefinedState(proxy, `${path}.#${String(func)}`) as any
        : undefinedState(proxy, path),
      safeCall: <U extends StringLiteralOrOther<keyof T>>(
        func: U,
        ...args: T extends undefined
          ? any[]
          : T extends { [key in U]: (...args: any[]) => any }
            ? [...Parameters<T[U]>]
            : any[]
      ) => {
        try {
          return unproxifiedResult.call(func, ...args);
        }
        catch(err){
          return undefinedState(proxy, `${path}.#${String(func)}(fail)`, err);
        }
      },
      action: (action: (value: T) => void) => {
        action(value);
        return result;
      },
      validate: (validator: (value: T) => boolean) => validator(value) ? result : undefinedState(proxy, `${path}.(validator)`),
      keys: () => value ? createState(Object, `${path}+Object`, false).safeCall("keys", value) : undefinedState(proxy, path),
      values: () => value ? createState(Object, `${path}+Object`, false).safeCall("values", value) : undefinedState(proxy, path),
      entries: () => value ? createState(Object, `${path}+Object`, false).safeCall("entries", value) : undefinedState(proxy, path),
      expect: <U>(invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => {
        const proxifedResult = invoke(createState(value, path, true)) as ProxifiedSafeTraverseState<U>;

        return createState(proxifedResult[INTERNAL].value, proxifedResult[INTERNAL].path, false) as SafeTraverseState<U>;
      },
      safeExpect: <U>(invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => {
        const proxifedResult = invoke(createState(value, path, true, true)) as ProxifiedSafeTraverseState<U>;

        return createState(proxifedResult[INTERNAL].value, proxifedResult[INTERNAL].path, false) as SafeTraverseState<U>;
      },
      async: (failSafe = true) => {
        const createSafeTraverseStatePromise: <T> (promise: Promise<SafeTraverseState<T>>) => SafeTraverseStatePromise<T> = <T> (promise: Promise<SafeTraverseState<T>>) => Object.assign(promise, {
          thenExpect: <U>(invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => (
            createSafeTraverseStatePromise(
              promise
                .then(result => result.expect(invoke).async(false))
                .then(result => createState(result.value, result.path, false))
            )
          ),
          thenGetProperty: <ExpectedReturn = any, PropertyName extends StringLiteralOrOther<keyof T> = keyof T>(name: PropertyName) => (
            createSafeTraverseStatePromise(
              promise
                .then(result => result.getProperty<ExpectedReturn, PropertyName>(name).async(false))
                .then(result => createState(result.value, result.path, false))
            ) as SafeTraverseStateGetResultPromise<T, ExpectedReturn, PropertyName, false>
          ),
          thenGet: (
            <ExpectedReturn = any, PropertyName extends StringLiteralOrOther<keyof T> = keyof T>(name?: PropertyName) => (
              name
                ? createSafeTraverseStatePromise(
                  promise
                    .then(result => result.get<ExpectedReturn, PropertyName>(name).async(false))
                    .then(result => createState(result.value, result.path, false))
                )
                : promise.then(result => result.get())
            ) as ReturnType<BaseSafeTraverseStateGetPromise<T>>
          ) as BaseSafeTraverseStateGetPromise<T>,
          thenAction: (action: (value: T) => void) => (
            createSafeTraverseStatePromise(
              promise.then(result => result.action(action))
            )
          ),
          thenCall: (
            <FunctionName extends StringLiteralOrOther<keyof T>>(
              func: FunctionName,
              ...args: T extends undefined
                ? any[]
                : T extends { [key in FunctionName]: (...args: any[]) => any }
                  ? Parameters<T[FunctionName]>
                  : any[]
            ) => (
              createSafeTraverseStatePromise(
                promise
                  .then(result => result.call(func, ...args).async(false))
                  .then(result => createState(result.value, result.path, false))
              )
            ) as SafeTraverseStatePromise<
                T extends undefined
                ? SafeTraverseState<undefined>
                : T extends { [key in FunctionName]: (...args: any[]) => any }
                  ? SafeTraverseState<ReturnType<T[FunctionName]>>
                  : SafeTraverseState<unknown>
            >
          ) as BaseSafeTraverseStateExecutePromise<T>,
          thenSelect: <U = any>(selector: (current: T) => U | undefined | null) => (
            createSafeTraverseStatePromise(
              promise
                .then(result => result.select(selector).async(false))
                .then(result => createState(result.value, result.path, false))
            )
          ),
          thenValidate: (validator: (value: T) => boolean) => (
            createSafeTraverseStatePromise(
              promise
                .then(result => result.validate(validator))
                .then(result => createState(result.value, result.path, false))
            )
          ),
          thenSafeCall: (
            <FunctionName extends StringLiteralOrOther<keyof T>>(
              func: FunctionName,
              ...args: T extends undefined
                ? any[]
                : T extends { [key in FunctionName]: (...args: any[]) => any }
                  ? Parameters<T[FunctionName]>
                  : any[]
            ) => (
              createSafeTraverseStatePromise(
                promise
                  .then(result => result.safeCall(func, ...args).async(true))
                  .then(result => result.error ? result : createState(result.value, result.path, false))
              )
            ) as SafeTraverseStatePromise<
                T extends undefined
                ? SafeTraverseState<undefined>
                : T extends { [key in FunctionName]: (...args: any[]) => any }
                  ? SafeTraverseState<ReturnType<T[FunctionName]>>
                  : SafeTraverseState<unknown>
            >
          ) as BaseSafeTraverseStateExecutePromise<T>,
          get thenValue(): Promise<T> {
            return promise.then(result => result.value);
          },
          thenSafeExpect: <U>(invoke: (target: ProxifiedSafeTraverseState<T>) => ProxifiedSafeTraverseState<U>) => (
            createSafeTraverseStatePromise(
              promise
                .then(result => result.safeExpect(invoke).async(true))
                .then(result => createState(result.value, result.path, false))
            )
          ),
        });

        // @ts-expect-error
        if(!value || typeof value.then !== "function"){
          return createSafeTraverseStatePromise(Promise.resolve(result as SafeTraverseState<T>));
        }

        if(failSafe){
          const promise = (async () => createState(await value, `${path}.(await)`, false))()
            .catch((err) => undefinedState(false, `${path}.(await)`, err));
          return createSafeTraverseStatePromise(promise);
        }else{
          return createSafeTraverseStatePromise((async () => createState(await value, `${path}.(await)`, false))());
        }
      },
    } as BaseSafeTraverseState<T>;

    const result = (
      proxy
        ? new Proxy(
          Object.assign(function(){}, { [INTERNAL]: unproxifiedResult }),
          {
            get: (target, prop) => {
              if (prop === INTERNAL) {
                return target[prop as unknown as keyof typeof target];
              }

              return target[INTERNAL].getProperty(prop as any);
            },
            apply: (target, thisArg, argArray) => {
              return target[INTERNAL][proxifiedSafeCall ? "safeCall" : "call"](
                "call",
                thisArg[INTERNAL].value, ...argArray
              );
            },
            construct: (target, argArray) => {
              // @ts-expect-error
              const instance = new (target[INTERNAL].value)(...argArray);
              return createState(instance, `${path}.#constructor`, true);
            }
          },
        ) as unknown as ProxifiedSafeTraverseState<T>
        : unproxifiedResult
    ) as P extends true ? ProxifiedSafeTraverseState<T> : SafeTraverseState<T>;

    if(unproxifiedResult.value === undefined){
      if(INTERNAL in result){
        proxifiedUndefinedState = result as ProxifiedSafeTraverseState<undefined>;
      }else{
        unProxifiedUndefinedState = result as SafeTraverseState<undefined>;
      }
    }

    return result;
  }

  let proxifiedUndefinedState: ProxifiedSafeTraverseState<undefined> | null = null;
  let unProxifiedUndefinedState: SafeTraverseState<undefined> | null = null;
  const undefinedState = <P extends boolean> (proxified: P, path: string, error?: any) => {
    const result = (
      proxified
        ? proxifiedUndefinedState ??= createState(undefined, path, true)
        : unProxifiedUndefinedState ??= createState(undefined, path, false)
    ) as P extends true ? ProxifiedSafeTraverseState<undefined> : SafeTraverseState<undefined>;

    result.error = error;

    return result;
  }

  return createState<S>(obj, "$", false);
}

interface SafeTraverse {
  <T>(obj: T): SafeTraverseState<T>
  from: <T>(obj: T) => SafeTraverseState<T>;
  default: SafeTraverse;
  safeTraverse: SafeTraverse;
};

const safeTraverse: SafeTraverse = safeTraverseFrom as SafeTraverse;
Object.defineProperties(safeTraverse, {
  from: {
    value: safeTraverseFrom,
  },
  default: {
    get: () => safeTraverse,
  },
  safeTraverse: {
    get: () => safeTraverse,
  },
});

export = safeTraverse;
