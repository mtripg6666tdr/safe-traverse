# safe-traverse

[![NPM Version](https://img.shields.io/npm/v/safe-traverse)](https://www.npmjs.com/package/safe-traverse)
[![CI](https://github.com/mtripg6666tdr/safe-traverse/actions/workflows/ci.yml/badge.svg)](https://github.com/mtripg6666tdr/safe-traverse/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/codecov/c/github/mtripg6666tdr/safe-traverse)](https://app.codecov.io/github/mtripg6666tdr/safe-traverse)

The `safe-traverse` library is an enhanced version of optional chains.
This allows you to safely access properties of JavaScript objects. This library helps avoid errors when accessing nested properties and simplifies error handling, especially if you want to handle unknown objects.

If a falsy value is encountered in the middle of a method chain,
all subsequent method chain returns will be [`SafeTraverseState<undefined>`](#safetraversestate).

One of the advantages of using this library is the ability to safely access properties that are expected to exist within an object without casting to `any` in TypeScript. This helps you to capsule potential risks (of mainly accessing properties of null or undefined) into the library itself.

Don't use this library to access properties of objects with guaranteed reliable structures.

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
  - [Examples](#examples)
  - [License](#license)


## Installation

```sh
npm install safe-traverse
```

## Usage

### Basic Usage

```ts
import safeTraverse from "safe-traverse";

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

```ts
const value = safeTraverse(obj).getProperty('a').getProperty('b').getProperty('c').value;
console.log(value); // 42
```

#### Simplified accessing

The `get` method can be used as a more concise alternative to `getProperty` and `value`.

```ts
const value = safeTraverse(obj).get("a").get("b").get("c").get();
console.log(value); // 42
```

#### More simplified accessing
The `expect` method allows you to simplify the chaining of get methods.
It provides a concise way to access nested properties.
```ts
safeTraverse(obj).expect(_ => _.a.b.c).value // 42
safeTraverse(obj).expect(_ => _.a.noProperty.noProperty).value // undefined
safeTraverse(window).expect(_ => new _.AbortController()).value // [object AbortController]
```
While it is possible to execute methods within the `expect` chain, it is not recommended due to the lack of error handling.
```ts
safeTraverse(obj).expect(_ => _.a()).value // `undefined`; no error thrown bacause a is not a function
safeTraverse(obj).expect(_ => _.nomethod()).value // `undefined`; no error thrown because `nomethod` is undefined

const obj2 = {
  throwsError: () => {
    throw new Error("error!");
  }
};

safeTraverse(obj2).expect(_ => _.throwsError()).value // an error thrown because `throwsError` is callable and throws an error
```
If any errors may be expected to occur, use `safeExpect` instead.
```ts
safeTraverse(obj2).safeExpect(_ => _.throwsError()).value // undefined.
```
Also, returning completely other objects is not permitted:
```ts
safeTraverse(obj).expect(_ => [_.a.b]).value // an error thrown because the array is not chaining from `_`. If you really want to do this please use `select` instead.
```

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
If you are not sure if the function can throw errors or not, use `safeCall` method together for safe operation like:

```ts
const selected = safeTraverse(obj).get("a")
  .select(o => () => [o.b.c] /* b will be undefined and reading c throws an error */)
  .safeCall("call") // Call `Function#call` method here
  .value;
console.log(selected);
```

### keys / values / entries

You can use `Object.keys`, `Object.values`, and `Object.entries` directly.

```ts
safeTraverse(obj).get("a").get("b").keys().value // ["c"]
safeTraverse(obj).get("a").get("b").values().value // [42]
safeTraverse(obj).get("a").get("b").entries().value // [["c", 42]]
```

### Executing Methods

Use the `call` method to safely call methods on an object.

```ts
const obj = {
  a: {
    b: {
      sum: (x, y) => x + y
    }
  }
};

const result = safeTraverse(obj).getProperty('a').getProperty('b').call('sum', 1, 2).value;
console.log(result); // 3
```

### Error Handling

The `safeCall` method attempts to execute a method with the given name. If it fails, it returns a `SafeTraverseState<undefined>` object. If it succeeds, it returns a `SafeTraverseState` object with the method's return value.

```ts
const selected = safeTraverse(obj).getProperty('a').safeCall('nonexistentMethod').value;
console.log(selected); // undefined
```

If one or more error(s) occurred while running the method passed to `safeCall` function,
the result contains the reason.
```ts
const obj = {
  fail: (message) => {
    throw new Error(message);
  }
};

const result = safeTraverse(obj).safeCall("fail", "error!");
console.log(result.value, result.error?.message); // undefined, error!
```

### Asynchronous Operations

Use the `async` method to support asynchronous operations.

If the current object state is `Promise` and you want the fulfilled value, you may want to extract the raw `Promise` from `value`.
```ts
const obj = {
  fn: async () => {
    // some heavy tasks here...
    return {
      "status": "OK"
    };
  }
};

const fulfilled = await safeTraverse(obj).call("fn").value; // get a promise and await it to get the fulfilled value
const status = safeTraverse(fulfilled).get("status").value; // "OK"

// or
const status = (await safeTraverse(obj).call("fn").value).status; // OK
// but accessing `status` may be unsafe
```

By using `async` method, the above code will be like this:
```ts
const status = (await safeTraverse(obj).call("fn").async()).value.status; // OK
```
`async` method converts the `SafeTraverseState<Promise<...>>` into `Promise<SafeTraverseState<...>>`.

However, accessing `status` may be still unsafe. To addressing this, use special functions within `Promise` returned by `async` method.
```ts
const status = await safeTraverse(obj).call("fn").async().thenGetProperty("status").thenValue; // OK
```
In fact, a `Promise` returned by the `async` method are `SafeTraverseState Promise`, enhanced version of the native `Promise`.
`SafeTraverseStatePromise` has `then`-prefixed methods such as `thenGetProperty`, `thenGet`, `thenCall`, etc.
If you call one of the `then`-prefixed methods, you will get `Promise` or `SafeTraverseStatePromise`, so you can `await` them anytime.  
When calling `thenGet` with no arguments or getting `thenValue`, they will return native `Promise`s that will be fulfilled with the actual value.
When calling any other `then`-prefixed methods in `SafeTraverseStatePromise`, they will return `SafeTraverseStatePromise` that will be fulfilled the `SafeTraverseState` objects.

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
import safeTraverse from "safe-traverse"; // or
import { safeTraverse } from "safe-traverse"; // or
const safeTraverse = require("safe-traverse");

const state = safeTraverse(obj) // or
const state = safeTraverse.from(obj)
```

### `SafeTraverseState`

Represents the state of the object and provides the following methods:

- `getProperty(name: string): SafeTraverseState`
- `get(name: string): SafeTraverseState`
- `get(): any`
- `expect(invoke: (current: T) => U): SafeTraverseState`
- `safeExpect(invoke: (current: T) => U): SafeTraverseState<undefined> | SafeTraverseState<any>`
- `validate(validator: (current: T) => boolean): SafeTraverseState<undefined> | SafeTraverseState<any>`
- `select(selector: (current: T) => U): SafeTraverseState`
- `call(func: string, ...args: any[]): SafeTraverseState`
- `safeCall(methodName: string): SafeTraverseState<undefined> | SafeTraverseState<any>`
- `async(failSafe?: boolean): SafeTraverseStatePromise`
- `keys(): string[]`
- `values:(): any[]`
- `entries(): any[][]`

### `SafeTraverseStatePromise` (extends `Promise`)

Represents the progress of an asynchronous operation.

## Examples
Fetch an API and read its data. If something goes wrong (e.g., no native `fetch` function), then the result will be undefined.
```ts
  /* Imagine the remote response json was like
    {
      "success": "OK",
      "result": [
        {
          items: [
            {
              "name": "fridge",
              "age": 5,
              "requireElectricity": true
            }
          ]
        }
      ]
    }
  */
const itemsRequireElectricity = await safeTraverse(window)
  .get("self") // window.self
  .call("fetch", "https://some-cool-api.com/api/items") // window.self.fetch(...)
  .async()
  .thenAction(res => console.log(status)) // "200"
  .thenSafeCall("json") // Response#json()
  .thenValidate(json => safeTraverse(json).getProperty("success") === "OK")
  .thenGet("result")
  .thenExpect(_ => _[0].items)
  .thenValidate(items => Array.isArray(items))
  .thenSelect(_ => _.filter(item => item?.requireElectricity))
  .values()
  .value;

// you can also do like this:
const itemsRequireElectricity = await safeTraverse(window)
  .call("fetch", "https://some-cool-api.com/api/items")
  .async()
  .thenSafeCall("json")
  .thenExpect(_ => _.result[0].items.filter(item => item?.requireElectricity))
  .values()
  .value;

// another way is applying safeTraverse only to the response object,
// if you've already found window.fetch is present.
const json = await window.fetch("https://some-cool-api.com/api/items")
  .then(r => r.json())
  .catch(console.error);

if(json){
  const itemsRequireElectricity = safeTraverse(json)
    .expect(_ =>  _.result[0].items.filter(item => item?.requireElectricity))
    .values()
    .value
}
```

## License

This library is licensed under the [LICENSE](LICENSE).

