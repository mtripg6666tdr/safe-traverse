// @ts-check
const safeTraverse = require("..");
const assert = require("assert");

const basicObject = {
  a: {
    b: {
      c: 42,
    },
  },
};

describe("Basic", function(){
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

  it("get should work fine", function(){
    const value = safeTraverse(basicObject).get("a").get("b").get("c").get();

    assert.strictEqual(value, basicObject.a.b.c);
  });

  it("expect should work fine", function(){
    const { value, path } = safeTraverse(basicObject).expect(_ => _.a.b.c);

    assert.strictEqual(value, basicObject.a.b.c);
    assert.strictEqual(path, "$.a.b.c");
  });
});
