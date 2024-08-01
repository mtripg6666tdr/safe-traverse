// @ts-check
const safeTraverse = require("..");
const assert = require("assert");

const basicObject = {
  a: {
    b: {
      c: 42,
    },
  },
  arrayOut: {
    array: [
      {
        type: "aa",
        a: 1,
        b: 2,
      },
      {
        type: "aa",
        a: 3,
        b: 4,
      },
      {
        type: "bb",
        a: 11,
        b: 12,
      },
      {
        type: "bb",
        a: 13,
        b: 14,
      },
    ]
  },
  functions: {
    return42: () => 42,
    /** @param {number} a @param {number} b */
    sum: (a, b) => a + b,
    /** @param {number} a @param {number} b */
    sumByThis(a, b){
      return this.sum(a, b);
    },
    returnFnObj: () => ({
      c: () => 42,
    }),
    throwError: () => {
      throw new Error("Error message!");
    },
  },
};

describe("Test", function(){
  it("export correctly", function(){
    assert.strictEqual(typeof safeTraverse, "function");
    assert.strictEqual(typeof safeTraverse(basicObject), "object");
    assert.deepStrictEqual(safeTraverse, safeTraverse.from);
    assert.deepStrictEqual(safeTraverse, safeTraverse.default);
    assert.deepStrictEqual(safeTraverse, safeTraverse.safeTraverse);
  });

  it("should return 42", function(){
    const { value, path } = safeTraverse(basicObject).getProperty("a").getProperty("b").getProperty("c");

    assert.strictEqual(value, basicObject.a.b.c);
    assert.strictEqual(path, "$.a.b.c");
  });

  it("should return object", function(){
    const { value, path } = safeTraverse(basicObject).getProperty("a").getProperty("b");

    assert.deepStrictEqual(value, basicObject.a.b);
    assert.strictEqual(path, "$.a.b");
  });

  it("should return undefined pt.1", function(){
    const { value, path } = safeTraverse(basicObject).getProperty("a").getProperty("b").getProperty("d").getProperty("e");

    assert.deepEqual(value, undefined);
    assert.deepEqual(path, "$.a.b.d");
  });

  it("get should work fine", function(){
    const value = safeTraverse(basicObject).get("a").get("b").get("c").get();

    assert.strictEqual(value, basicObject.a.b.c);
  });

  it("expect should work fine", function(){
    const { value, path } = safeTraverse(basicObject).expect(_ => _.a.b.c);

    assert.strictEqual(value, basicObject.a.b.c);
    assert.strictEqual(path, "$.a.b.c");
  });

  it("select the correct array element", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .select(items => items.find(item => item.a === 1));

    assert.deepStrictEqual(value, {
      type: "aa",
      a: 1,
      b: 2,
    });
    assert.strictEqual(path, "$.arrayOut.array.(selector)");
  });

  it("chain after selector", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .select(items => items.find(item => item.a === 1))
      .getProperty("b");

    assert.strictEqual(value, 2);
    assert.strictEqual(path, "$.arrayOut.array.(selector).b");
  });

  it("return undefined when selector return a falsy value", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .select(_ => false);

    assert.deepStrictEqual(value, undefined);
    assert.strictEqual(path, "$.arrayOut.array.(selector)");
  });

  it("select after chaining undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .get("nothing")
      .select(_ => {
        throw new Error("never call me");
      });

    assert.deepStrictEqual(value, undefined);
    assert.strictEqual(path, "$.arrayOut.array.nothing");
  });

  it("call function", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .call("return42");

    assert.strictEqual(value, 42);
    assert.strictEqual(path, "$.functions.#return42");
  });

  it("call function with arguments", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .call("sum", 1, 2);

    assert.strictEqual(value, 3);
    assert.strictEqual(path, "$.functions.#sum");
  });

  it("call not a function should return undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .call("notAFunction");

    assert.strictEqual(value, undefined);
    assert.strictEqual(path, "$.functions.#notAFunction");
  });

  it("call function after chaining undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .get("nothing")
      .call("return42");

    assert.strictEqual(value, undefined);
    assert.strictEqual(path, "$.functions.nothing");
  });

  it("call function that throws error", function(){
    assert.throws(() => (
      safeTraverse(basicObject)
        .getProperty("functions")
        .call("throwError")
    ));
  });

  it("safe-call function that throws error", function(){
    const { value, path, error } = safeTraverse(basicObject)
      .getProperty("functions")
      .safeCall("throwError");

    assert.strictEqual(value, undefined);
    assert.strictEqual(path, "$.functions.#throwError(fail)");
    assert.strictEqual(error?.message, "Error message!");
  });
});
