// @ts-check
const safeTraverse = require("..");
const spies = require("chai-spies");
/** @type {import("chai")} */
let chai;
/** @type {import("chai").expect} */
let expect;

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
    async42: async () => 42,
  },
  manyKeys: {
    a: 1,
    b: {},
    c: false,
  },
};

describe("Test", function(){
  this.beforeAll(function(done){
    this.timeout(5e3);

    Promise.all([
      import("chai").then(mod => {
        chai = mod;

        expect = chai.expect;
        chai = chai.use(spies);
      }),
    ]).then(() => done());
  });

  it("export correctly", function(){
    expect(typeof safeTraverse).to.equal("function");
    expect(typeof safeTraverse(basicObject)).to.equal("object");
    expect(safeTraverse).to.equal(safeTraverse.from);
    expect(safeTraverse).to.equal(safeTraverse.default);
    expect(safeTraverse).to.equal(safeTraverse.safeTraverse);
  });

  it("getProperty numeric", function(){
    const { value, path } = safeTraverse(basicObject).getProperty("a").getProperty("b").getProperty("c");

    expect(value).to.equal(basicObject.a.b.c);
    expect(path).to.equal("$.a.b.c");
  });

  it("getProperty object", function(){
    const { value, path } = safeTraverse(basicObject).getProperty("a").getProperty("b");

    expect(value).to.deep.equal(basicObject.a.b);
    expect(path).to.equal("$.a.b");
  });

  it("getPropety should return undefined pt.1", function(){
    const { value, path } = safeTraverse(basicObject).getProperty("a").getProperty("b").getProperty("d").getProperty("e");

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.d");
  });

  it("get should work fine", function(){
    const value = safeTraverse(basicObject).get("a").get("b").get("c").get();

    expect(value).to.equal(basicObject.a.b.c);
  });

  it("select the correct array element", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .select(items => items.find(item => item.a === 1));

    expect(value).to.deep.equal({
      type: "aa",
      a: 1,
      b: 2,
    });
    expect(path).to.equal("$.arrayOut.array.(selector)");
  });

  it("chain after selector", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .select(items => items.find(item => item.a === 1))
      .getProperty("b");

    expect(value).to.equal(2);
    expect(path).to.equal("$.arrayOut.array.(selector).b");
  });

  it("return undefined when selector return a falsy value", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .select(_ => false);

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.arrayOut.array.(selector)");
  });

  it("select after chaining undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("arrayOut")
      .get("array")
      .get("nothing")
      .select(_ => {
        throw new Error("never call me");
      });

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.arrayOut.array.nothing");
  });

  it("call function", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .call("return42");

    expect(value).to.equal(42);
    expect(path).to.equal("$.functions.#return42");
  });

  it("call function with arguments", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .call("sum", 1, 2);

    expect(value).to.equal(3);
    expect(path).to.equal("$.functions.#sum");
  });

  it("call not a function should return undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .call("notAFunction");

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.functions.notAFunction");
  });

  it("call function after chaining undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("functions")
      .get("nothing")
      .call("return42");

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.functions.nothing");
  });

  it("call function that throws error", function(){
    expect(() => (
      safeTraverse(basicObject)
        .getProperty("functions")
        .call("throwError")
    )).to.throw();
  });

  it("safe-call function that throws error", function(){
    const { value, path, error } = safeTraverse(basicObject)
      .getProperty("functions")
      .safeCall("throwError");

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.functions.#throwError(fail)");
    expect(error).to.have.a.property("message", "Error message!");
  });

  it("action", function(){
    const spy = chai.spy();

    const { value, path } = safeTraverse(basicObject)
      .get("a")
      .get("b")
      .action(spy)
      .get("c");

    expect(value).to.equal(basicObject.a.b.c);
    expect(path).to.equal("$.a.b.c");
    expect(spy).to.have.been.called.with(basicObject.a.b);
  });

  it("action after chaining undefined", function(){
    const spy = chai.spy();

    const { value, path } = safeTraverse(basicObject)
      .get("a")
      .get("b")
      .get("nothing")
      .action(spy)
      .get("c");

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.nothing");
    expect(spy).to.have.been.called.with(undefined);
  });

  it("action throwing an error", function(){
    const spy = chai.spy(() => {
      throw new Error("Error message! action throwing an error");
    });

    expect(() => (
      safeTraverse(basicObject)
        .get("a")
        .get("b")
        .action(spy)
        .get("c")
    )).to.throw("Error message! action throwing an error");
  });

  it("validate to be ok", function(){
    const validator = chai.spy(/** @type {(_: any) => boolean} */ _ => _ === basicObject.a.b);
    const { value, path } = safeTraverse(basicObject)
      .get("a")
      .get("b")
      .validate(validator)
      .get("c");

    expect(value).to.equal(basicObject.a.b.c);
    expect(path).to.equal("$.a.b.c");
    expect(validator).to.have.been.called();
  });

  it("validate to be fail", function(){
    const validator = chai.spy(/** @type {(_: any) => boolean} */ _ => false);
    const { value, path } = safeTraverse(basicObject)
      .get("a")
      .get("b")
      .validate(validator)
      .get("c");

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.(validator)");
    expect(validator).to.have.been.called();
  });

  it("validator throwing an error", function(){
    const validator = chai.spy(() => {
      throw new Error("Error message! validator throwing an error");
    });

    expect(() => (
      safeTraverse(basicObject)
        .get("a")
        .get("b")
        .validate(validator)
        .get("c")
    )).to.throw("Error message! validator throwing an error");
  });

  it("keys", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("manyKeys")
      .keys();

    expect(value).to.deep.equal(["a", "b", "c"]);
    expect(path).to.equal("$.manyKeys+Object.#keys");
  });

  it("keys after chaining undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("manyKeys")
      .get("nothing")
      .keys();

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.manyKeys.nothing");
  });

  it("values", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("manyKeys")
      .values();

    expect(value).to.deep.equal([1, {}, false]);
    expect(path).to.equal("$.manyKeys+Object.#values");
  });

  it("values after chaining undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("manyKeys")
      .get("nothing")
      .values();

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.manyKeys.nothing");
  });

  it("entries", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("manyKeys")
      .entries();

    expect(value).to.deep.equal([["a", 1], ["b", {}], ["c", false]]);
    expect(path).to.equal("$.manyKeys+Object.#entries");
  });

  it("entries after chaining undefined", function(){
    const { value, path } = safeTraverse(basicObject)
      .getProperty("manyKeys")
      .get("nothing")
      .entries();

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.manyKeys.nothing");
  });

  it("expect", function(){
    const { value, path } = safeTraverse(basicObject).expect(_ => _.a.b.c);

    expect(value).to.equal(basicObject.a.b.c);
    expect(path).to.equal("$.a.b.c");
  });

  it("expect when trying to call undefined as a function", function(){
    const { value, path } = safeTraverse(basicObject).expect(_ => _.a.b.c.d.e());

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.c.d");
  });

  it("expect when trying to call number as a function", function(){
    const { value, path } = safeTraverse(basicObject).expect(_ => _.a.b.c());

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.c.call");
  });

  it("safeExpect with successful result", function(){
    const { value, path } = safeTraverse(basicObject)
      .safeExpect(_ => _.a.b.c);

    expect(value).to.equal(basicObject.a.b.c);
    expect(path).to.equal("$.a.b.c");
  });

  it("safeExpect with failed result", function(){
    const { value, path } = safeTraverse(basicObject)
      .safeExpect(_ => _.a.b.c.d.e);

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.c.d");
  });

  it("safeExpect when trying to call undefined as a function", function(){
    const { value, path } = safeTraverse(basicObject).safeExpect(_ => _.a.b.c.d.e());

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.c.d");
  });

  it("safeExpect when trying to call number as a function", function(){
    const { value, path } = safeTraverse(basicObject).safeExpect(_ => _.a.b.c());

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.a.b.c.call");
  });

  it("safeExpect when trying to call a function that throws an error", function(){
    const { value, path, error } = safeTraverse(basicObject).safeExpect(_ => _.functions.throwError());

    expect(value).to.equal(undefined);
    expect(path).to.equal("$.functions.throwError.#call(fail)");
    expect(error).to.have.a.property("message", "Error message!");
  });

  it("async", async function(){
    const { value, path } = await safeTraverse(basicObject)
      .getProperty("functions")
      .call("async42")
      .async();

    expect(value).to.equal(42);
    expect(path).to.equal("$.functions.#async42.(await)");
  });
});
