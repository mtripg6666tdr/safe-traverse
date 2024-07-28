# safe-traverse

The `safe-traverse` library is a enhanced version of optional chains.
This allows you to safely access properties of JavaScript objects. This library helps avoid errors when accessing nested properties and simplifies error handling, especially if you want to handle unknown objects.

If a falsy value is encountered in the middle of a method chain,
all subsequent method chain returns will be `SafeTraverseState<undefined>`.

- [safe-traverse](#safe-traverse)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Basic Usage](#basic-usage)
    - [Accessing Properties](#accessing-properties)
      - [Simplified accessing](#simplified-accessing)
      - [More simplified accessing](#more-simplified-accessing)
    - [Validation](#validation)
    - [Selecting Properties](#selecting-properties)
    - [keys / values / entries](#keys--values--entries)
    - [Executing Methods](#executing-methods)
    - [Error Handling](#error-handling)
    - [Asynchronous Operations](#asynchronous-operations)
    - [Action](#action)
  - [API Reference](#api-reference)
    - [`safeTraverse`](#safetraverse)
    - [`SafeTraverseState`](#safetraversestate)
    - [`SafeTraverseStatePromise` (extends `Promise`)](#safetraversestatepromise-extends-promise)
  - [License](#license)


## Installation

```sh
npm install safe-traverse
```

## Usage

### Basic Usage

```ts
import safeTraverse from 'safe-traverse';

const obj = {
  a: {
    b: {
      c: 42
    }
  }
};

const result = safeTraverse(obj).getProperty("a").getProperty("b").getProperty("c");
console.log(result.value); // 42
console.log(result.path); // $.a.b.c
```

### Accessing Properties

Use the `getProperty` method to access properties of an object. 

At the end of the method chain, use the `value` property to retrieve the value.
**Do not modify `value` property value manually`**

```ts
const value = safeTraverse(obj).state.getProperty('a').getProperty('b').getProperty('c').value;
console.log(value); // 42
```

#### Simplified accessing

The `get` method can be used as a more concise alternative to `getProperty` and value.

```ts
const value = safeTraverse(obj).state.get("a").get("b").get("c").get();
console.log(value); // 42
```

#### More simplified accessing
The `expect` method allows you to simplify the chaining of get methods.
It provides a concise way to access nested properties.
```ts
safeTraverse(obj).expect(_ => _.a.b.c).value // 42
safeTraverse(obj).expect(_ => _.a.noProperty).value // undefined
safeTraverse(window).expect(_ => new _.AbortController()).value // [object AbortController]
```
While it is possible to execute methods within the `expect` chain, it is not recommended due to the lack of error handling.
```ts
safeTraverse(obj).expect(_ => _.a()).value // `undefined`; no error thrown bacause a is not a function
safeTraverse(obj).expect(_ => _.noProperty).value // `undefined`; no error thrown because noProperty is undefined

const obj2 = {
  throwsError: () => {
    throw new Error("error!");
  }
};

safeTraverse(obj2).expect(_ => _.throwsError()).value // an error thrown because `throwsError` is callable and throws an error
```
Also, returning completely other objects is not permitted:
```ts
safeTraverse(obj).expect(_ => [_.a.b]).value // an error thrown because the array is not chaining from `_`
```
The `expect` method provides an intuitive way to access properties in objects, despite the limitations mentioned above.

### Validation
The `validate` method allows you to validate the value of a property in the method chain. It takes a validator function as an argument, which determines whether the value meets the specified criteria. If the validation fails, subsequent method chain returns will be `SafeTraverseState<undefined>`.

```ts
const selected = safeTraverse(obj).get("a").get("b").validate(value => typeof value === "object").get("c").value;
console.log(selected); // 42 because the validator function will return true
```

```ts
const selected = safeTraverse(obj).get("a").get("b").validate(value => typeof value === "number").value;
console.log(selected); // undefined because the validator function will return false
```

### Selecting Properties

The `select` method allows you to retrieve a specific property or value from the current object state. It takes a selector function as an argument, which determines the property or value to be selected.

```ts
const selected = safeTraverse(obj).get("a").get("b").select(o => [o.c, o.d]).value;
console.log(selected); // [42, undefined]
```

Note that any errors that occur within the function passed to the `select` method are not handled. 
If the current object state is already a falsy value, the function will not be called.
You have to pass the function that never throw errors as long as the argument is not falsy.
If you are not sure if the function can throw errors or not, use `failSafe` method together for safe operation like:

```ts
const selected = safeTraverse(obj).get("a")
  .select(o => () => o.b.c /* b will be undefined and reading c throws an error */)
  .failSafe("call")
  .value;
console.log(selected);
```

### keys / values / entries

You can use `Object.keys`, `Object.values`, and `Object.entries` directly.

```ts
safeTraverse(obj).get("a").keys().value // ["b"]
safeTraverse(obj).get("a").values().value // [{ c: 42 }]
safeTraverse(obj).get("a").get("b").entries().value // [["c", 42]]
```

### Executing Methods

Use the `execute` method to safely call methods on an object.

```ts
const obj = {
  a: {
    b: {
      sum: (x, y) => x + y
    }
  }
};

const result = safeTraverse(obj).getProperty('a').getProperty('b').execute('sum', 1, 2).value;
console.log(result); // 3
```

### Error Handling

The `failSafe` method attempts to execute a method with the given name. If it fails, it returns a `SafeTraverseState<undefined>` object. If it succeeds, it returns a `SafeTraverseState` object with the method's return value.

```ts
const selected = safeTraverse(obj).getProperty('a').failSafe('nonexistentMethod').value;
console.log(selected); // undefined
```

If one or more error(s) occurred while running the method passed to `failSafe` function,
the result contains the reason.
```ts
const obj = {
  fail: (message) => {
    throw new Error(message);
  }
};

const result = safeTraverse(obj)
  .failSafe("fail", "error!");
console.log(result.value, result.error?.message); // undefined, error!
```

### Asynchronous Operations

Use the `async` method to support asynchronous operations.

If the current object state is `Promise` and you want the fulfilled value, normally you have to extract the raw `Promise` value.
```ts
const obj = {
  fn: async () => {
    // some heavy tasks here...
    return {
      "status": "OK"
    };
  }
};

const promise = await safeTraverse(obj).execute("fn").value;
const status = safeTraverse(obj).get("status").value; // OK

// or
const status = (await safeTraverse(obj).execute("fn").value).status; // OK
// but accessing `status` may be unsafe
```

By using `async` method, the above code will be like this:
```ts
const status = (await safeTraverse(obj).execute("fn").async()).value.status; // OK
```
`async` method converts the `SafeTraverseState` into `SafeTraverseStatePromise`, an awaitable object, that will be fulfilled with `SafeTraverseState`.

However, accessing `status` may be still unsafe. To addressing this, use special functions in `SafeTraverseStatePromise` which will be returned by `async` method.
```ts
const status = await safeTraverse(obj).execute("fn").async().thenGetProperty("status").thenValue; // OK
```
`SafeTraverseStatePromise` has `thenGetProperty`, `thenGet`, `thenExecute`, etc.
Once you use `async` method, all `then`-prefixed methods return `SafeTraverseStatePromise`, so you can `await` them anytime.  
When calling `thenGet` with no arguments or getting `thenValue`, they will return native `Promise`s that will be fulfilled with the actual value.
When calling any other methods in `SafeTraverseStatePromise`, they will return `SafeTraverseStatePromise` that will be fulfilled the `SafeTraverseState` objects.

### Action
The `action` method allows you to call a function without altering the state of the object. The return value of the function is ignored and the method chain continues as is.

```ts
const obj = {
  a: {
    b: {
      c: 42
    }
  }
};

safeTraverse(obj)
  .get("a")
  .get("b")
  .action(value => console.log(value)) // Logs: { c: 42 }
  .get("c")
  .value; // 42
```

The `action` method is useful when you want to execute an arbitrary function in the middle of a method chain without changing the value.
The action method does not handle errors, so you need to ensure that the function does not throw any errors.

## API Reference

### `safeTraverse`

Takes an object and returns a `SafeTraverseState` object.

```ts
function safeTraverse<T>(obj: T): SafeTraverseState<T>;
```

You can use one of the following ways:
```ts
import safeTraverseState from "safe-traverse"; // or
import { safeTraverseState } from "safe-traverse"; // or
const safeTraverseState = require("safe-traverse");

const state = safeTraverseState(obj) // or
const state = safeTraverseState.from(obj)
```

### `SafeTraverseState`

Represents the state of the object and provides the following methods:

- `getProperty(name: string): SafeTraverseState`
- `get(name: string): SafeTraverseState`
- `get(): any`
- `expect(invoke: (current: T) => U): SafeTraverseState`
- `validate(validator: (current: T) => boolean): SafeTraverseState<undefined> | SafeTraverseState<any>`
- `select(selector: (current: T) => U): SafeTraverseState`
- `execute(func: string, ...args: any[]): SafeTraverseState`
- `failSafe(methodName: string): SafeTraverseState<undefined> | SafeTraverseState<any>`
- `async(failSafe?: boolean): SafeTraverseStatePromise`

### `SafeTraverseStatePromise` (extends `Promise`)

Represents the progress of an asynchronous operation.


## License

This library is licensed under the [LICENSE](LICENSE).

