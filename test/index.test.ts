import * as D from '../src/index'

const shouldBe = <T>(decoder: D.Decoder<T>, input: unknown, output: T): void =>
  expect(decoder.forceDecode(input)).toStrictEqual(output)
const shouldFail = <T>(decoder: D.Decoder<T>, value: unknown): void =>
  expect(() => decoder.forceDecode(value)).toThrow(D.DecoderError)

// Check defined
test('checkDefined fails when given an undefined value', () => {
  expect(() => D.checkDefined(null)).toThrow(D.DecoderError)
  expect(() => D.checkDefined(undefined)).toThrow(D.DecoderError)
})
test('checkDefined succeeds when given a defined value', () => {
  expect(() => D.checkDefined('test')).not.toThrow(D.DecoderError)
  expect(() => D.checkDefined(5)).not.toThrow(D.DecoderError)
  expect(() => D.checkDefined(true)).not.toThrow(D.DecoderError)
  expect(() => D.checkDefined({})).not.toThrow(D.DecoderError)
  expect(() => D.checkDefined([])).not.toThrow(D.DecoderError)
})

//
// Decoders
//
const primitiveTest = <T>(
  name: string,
  decoder: D.Decoder<T>,
  values: {success: T[], failure: unknown[]}
): void => {
  test(`${name} succeeds when given the correct type`, () => {
    values.success.forEach($ => shouldBe(decoder, $, $))
  })
  test(`${name} fails when given a wrong type`, () => {
    [...values.failure, {}, []].forEach($ => shouldFail(decoder, $))
  })
  test(`${name} fails when given null or undefined`, () => {
    shouldFail(decoder, null)
    shouldFail(decoder, undefined)
  })
}

// String
primitiveTest('D.string', D.string, {
  success: ['test', ''], failure: [5, true]
})

// Number
primitiveTest('D.number', D.number, {
  success: [5, 0], failure: ['test', false]
})

// Booleans
primitiveTest('D.boolean', D.boolean, {
  success: [true, false], failure: ['test', 5]
})

// Nullable
test('D.nullable succeeds when given null or the correct type', () => {
  shouldBe(D.nullable(D.string), null, null)
  shouldBe(D.nullable(D.string), 'test', 'test')
})
test('D.nullable fails when given undefined', () => {
  shouldFail(D.nullable(D.string), undefined)
})

// Literal
test('D.literal succeeds when given the correct type', () => {
  shouldBe(D.literal('test'), 'test', 'test')
  shouldBe(D.literal(5), 5, 5)
  shouldBe(D.literal(true), true, true)
})
test('D.literal fails when given a different value', () => {
  shouldFail(D.literal('test'), '')
  shouldFail(D.literal('test'), 'bar')
  shouldFail(D.literal(5), '')
  shouldFail(D.literal(5), 3)
  shouldFail(D.literal(true), false)
  shouldFail(D.literal(true), '')
  shouldFail(D.literal(true), 7)
})
test('D.literal fails when given a wrong type', () => {
  shouldFail(D.literal('test'), [])
  shouldFail(D.literal('test'), {})
})
test('D.literal fails when given null or undefined', () => {
  shouldFail(D.literal('test'), null)
  shouldFail(D.literal('test'), undefined)
})

// One of
test('D.oneOf succeeds when given one of the permitted types', () => {
  shouldBe(D.oneOf(D.number, D.string), 'test', 'test')
  shouldBe(D.oneOf(D.number, D.string), 5, 5)
  shouldBe(D.oneOf(D.number, D.nullable(D.string)), null, null)
  shouldBe(D.oneOf(D.number, D.nullable(D.string)), 'test', 'test')
  shouldBe(D.oneOf(D.number, D.nullable(D.string)), 5, 5)
})
test('D.oneOf fails when given a non-listed type', () => {
  shouldFail(D.oneOf(D.string), 5)
  shouldFail(D.oneOf(D.string, D.number), undefined)
  shouldFail(D.oneOf(D.string, D.number), null)
})

// Literal union
test('D.literalUnion succeeds when given one of the specified literals', () => {
  shouldBe(D.literalUnion('a', 5), 'a', 'a')
  shouldBe(D.literalUnion('a', 5), 5, 5)
})
test('D.literalUnion fails when given a non-listed literal', () => {
  shouldFail(D.literalUnion('a', 5), true)
  shouldFail(D.literalUnion('a', 5), 'b')
})
test('D.literalUnion fails when given an unsupported type', () => {
  shouldFail(D.literalUnion('a', 5), {})
  shouldFail(D.literalUnion('a', 5), [])
})
test('D.literalUnion fails when given null or undefined', () => {
  shouldFail(D.literalUnion('a', 5), null)
  shouldFail(D.literalUnion('a', 5), undefined)
})

// Regex
test('D.regex succeeds when regex is satisfied', () => {
  shouldBe(D.regex(/^[a-z]+$/), 'test', 'test')
})

test('D.regex fails when regex is not satisfied', () => {
  shouldFail(D.regex(/^[a-z]+$/), 'TEST!')
  shouldFail(D.regex(/^[a-z]+$/), null)
  shouldFail(D.regex(/^[a-z]+$/), undefined)
})

// Array
test('D.array succeeds when given an array of the correct type', () => {
  shouldBe(D.array(D.unknown), [], [])
  shouldBe(D.array(D.number), [1, 2, 3], [1, 2, 3])
})
test('D.array fails when given an array of wrong types', () => {
  shouldFail(D.array(D.number), ['test', 'test'])
  shouldFail(D.array(D.number), [1, 2, 3, ''])
})
test('D.array fails when given something that is not an array', () => {
  shouldFail(D.array(D.unknown), {})
  shouldFail(D.array(D.unknown), 5)
  shouldFail(D.array(D.unknown), 'test')
  shouldFail(D.array(D.unknown), new Set())
})
test('D.array fails when given null or undefined', () => {
  shouldFail(D.array(D.unknown), undefined)
  shouldFail(D.array(D.unknown), null)
})

// Iterable
test('D.iterable succeeds when given a set', () => {
  shouldBe(D.iterable(D.unknown), new Set(), [])
  shouldBe(D.iterable(D.number), new Set([1, 2, 3]), [1, 2, 3])
})
test('D.iterable fails when given a set of wrong types', () => {
  shouldFail(D.iterable(D.number), new Set(['test', 'test']))
  shouldFail(D.iterable(D.number), new Set([1, 2, 3, '']))
})
test('D.iterable fails when given null or undefined', () => {
  shouldFail(D.iterable(D.unknown), undefined)
  shouldFail(D.iterable(D.unknown), null)
})

// Tuple
test('D.tuple succeeds when given a tuple with at least the required length', () => {
  shouldBe(D.tuple(D.number, D.string), [5, ''], [5, ''])
})
test('D.tuple crops the tuple if it is longer than the required length', () => {
  shouldBe(D.tuple(D.number, D.string), [5, '', true], [5, ''])
})
test('D.tuple fails when given a non-array type', () => {
  shouldFail(D.tuple(D.unknown), { foo: 'bar' })
  shouldFail(D.tuple(D.unknown), {})
})
test('D.tuple fails when given a shorter tuple', () => {
  shouldFail(D.tuple(D.unknown, D.unknown), [5])
})
test('D.tuple fails when given null or undefined', () => {
  shouldFail(D.tuple(D.unknown), null)
  shouldFail(D.tuple(D.unknown), undefined)
})

// Record
test('D.record succeeds when given a record of the right type', () => {
  shouldBe(D.record(D.number), { foo: 1, bar: 5 }, { bar: 5, foo: 1 })
  shouldBe(D.record(D.unknown), {}, {})
})
test('D.record fails when given a record of the wrong type', () => {
  shouldFail(D.record(D.number), { foo: 1, bar: 'test' })
  shouldFail(D.record(D.unknown), [])
})
test('D.record fails when given null or undefined', () => {
  shouldFail(D.record(D.unknown), null)
  shouldFail(D.record(D.unknown), undefined)
})

// Key-value pairs
test('D.keyValuePairs succeeds when given a dict', () => {
  shouldBe(D.keyValuePairs(D.number), { a: 1, b: 2 }, [['a', 1], ['b', 2]])
  shouldBe(D.keyValuePairs(D.unknown), {}, [])
})
test('D.keyValuePairs fails when it gets an invalid record', () => {
  shouldFail(D.keyValuePairs(D.number), { a: 'a', b: 'b' })
  shouldFail(D.keyValuePairs(D.unknown), [])
  shouldFail(D.keyValuePairs(D.unknown), 'test')
  shouldFail(D.keyValuePairs(D.unknown), 5)
})
test('D.keyValuePairs fails when given null or undefined', () => {
  shouldFail(D.keyValuePairs(D.unknown), null)
  shouldFail(D.keyValuePairs(D.unknown), undefined)
})

// Object
test('D.object succeeds when it has all required fields', () => {
  shouldBe(D.object({ required: { foo: D.string, bar: D.number } }), { foo: 'test', bar: 5 }, { foo: 'test', bar: 5 })
})
test('D.object succeeds and crops when given some of the optional fields', () => {
  shouldBe(D.object({ optional: { foo: D.string } }), { foo: 'test', bar: 5 }, { foo: 'test' })
})
test('D.object succeeds and crops when given some of the optional fields', () => {
  shouldBe(D.object({ required: { foo: D.string } }), { foo: 'test', bar: 5 }, { foo: 'test' })
})
test('D.object fails when given null or undefined', () => {
  shouldFail(D.object({ optional: { foo: D.string } }), null)
  shouldFail(D.object({ optional: { foo: D.string } }), undefined)
})

// Recursive
test('D.recursive succeeds when used correctly', () => {
  // We need to specify the types beforehand
  type User = [string, string, User[]]

  const userDecoder: D.Decoder<User> =
    D.tuple(D.string, D.string, D.array(D.recursive(() => userDecoder)))

  const users: User = [
    'Brad',
    'Pitt',
    [
      ['Johnny', 'Depp', [['Al', 'Pacino', []]]],
      ['Leonardo', 'DiCaprio', []]
    ]
  ]

  shouldBe(userDecoder, users, users)

  interface Category {
    name: string,
    subcategories: Category[]
  }

  const categoryDecoder: D.Decoder<Category> = D.object({
    required: {
      name: D.string,
      subcategories: D.array(D.recursive(() => categoryDecoder))
    }
  })

  const categoryDecoder_: D.Decoder<Category> = D.recursive(() =>
    D.object({
      required: {
        name: D.string,
        subcategories: D.array(categoryDecoder_)
      }
    })
  )

  const categories = {
    name: 'Electronics',
    subcategories: [
      {
        name: 'Computers',
        subcategories: [
          { name: 'Desktops', subcategories: [] },
          { name: 'Laptops', subcategories: [] }
        ]
      },
      { name: 'Fridges', subcategories: [] }
    ]
  }

  shouldBe(categoryDecoder, categories, categories)
  shouldBe(categoryDecoder_, categories, categories)
})

//
// Methods
//

// maybe
test('Decoder.decode returns the value when the decoder succeeds', () => {
  expect(D.string.decode('test')).toStrictEqual('test')
  expect(D.array(D.string).decode(['test'])).toStrictEqual(['test'])
})
test('Decoder.decode returns null when the decoder fails', () => {
  expect(D.string.decode(5)).toStrictEqual(null)
  expect(D.array(D.string).decode('test')).toStrictEqual(null)
})

// andThen
test('Decoder.andThen changes the type after parsed', () => {
  shouldBe(D.number.andThen($ => $.toString()), 5, '5')
  const objectDecoder = D.object({
    required: { a: D.number },
    optional: { b: D.number }
  }).andThen($ => ({
    a: $.a.toString(),
    b: $.b?.toString()
  }))
  shouldBe(objectDecoder, { a: 5, b: 10 }, { a: '5', b: '10' })
  shouldBe(objectDecoder, { a: 5 }, { a: '5', b: undefined })
})
test('Decoder.andThen fails when the transformer fails', () => {
  shouldFail(D.unknown.andThen(_ => { throw new D.DecoderError() }), '')
})
test('Decoder.andThen fails when the decoder fails', () => {
  shouldFail(D.number.andThen(Number.prototype.toString), 'test')
  shouldFail(D.number.andThen($ => $.toString()), 'test')
})

// is
test('Decoder.is returns true for correct type', () => {
  expect(D.string.is('test')).toBe(true)
  expect(D.object({
    required: { a: D.number },
    optional: { b: D.number }
  }).is({ a: 2 })).toBe(true)
})
test('Decoder.is returns false for wrong type', () => {
  expect(D.string.is(5)).toBe(false)
  expect(D.array(D.unknown).is({})).toBe(false)
  expect(D.unknown.is({})).toBe(true)
})

// validate
test('Decoder.validate on invalid data returns error', () => {
  expect(D.string.validate(5).type).toBe('error')
})
test('Decoder.validate on invalid data returns error', () => {
  expect(D.string.validate(5)).toHaveProperty('error')
})
test('Decoder.validate on valid data returns ok', () => {
  expect(D.string.validate('hi')).toStrictEqual({ type: 'ok', data: 'hi' })
})

test('DecodeError path of tuple is correct', () => {
  const result = D.tuple(D.string, D.string).validate(["h1", 2]);
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("1: This is not a string: 2")
  } else {
    fail("Expected error")
  }
})

test('DecodeError path of an array is correct', () => {
  const result = D.array(D.string).validate(["h1", "h2", 3.14]);
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("2: This is not a string: 3.14")
  } else {
    fail("Expected error")
  }
})

test('DecodeError path of an object required key is correct', () => {
  const result = D.object({required: {name: D.string}}).validate({name: 1});
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("name: This is not a string: 1")
  } else {
    fail("Expected error")
  }
})

test('DecodeError path of an object optional key is correct', () => {
  const result = D.object({optional: {name: D.string}}).validate({name: 1});
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("name: This is not a string: 1")
  } else {
    fail("Expected error")
  }
})

test('DecodeError path of a record is correct', () => {
  const result = D.record(D.object({required: {name: D.string}})).validate({"charles": {name: 1}});
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("charles.name: This is not a string: 1")
  } else {
    fail("Expected error")
  }
})

test('DecodeError path of a key value pair is correct', () => {
  const result = D.keyValuePairs(D.object({required: {name: D.string}})).validate({"charles": {name: 1}});
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("charles.name: This is not a string: 1")
  } else {
    fail("Expected error")
  }
})

test('DecodeError path of a nested object is correct', () => {
  const result = D.object({optional: {sub: D.object({required: {name: D.string}})}}).validate({sub:{name: 1}});
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("sub.name: This is not a string: 1")
  } else {
    fail("Expected error")
  }
})

test('DecodeError path of a recursive type is correct', () => {

  const categories: any = {
    name: 'Electronics',
    subcategories: [
      {
        name: 'Computers',
        subcategories: [
          { name: 'Desktops', subcategories: [] },
          { name: 1, subcategories: [] }
        ]
      },
      { name: 'Fridges', subcategories: [] }
    ]
  }

  interface Category {
    name: string,
    subcategories: Category[]
  }

  const categoryDecoder: D.Decoder<Category> = D.object({
    required: {
      name: D.string,
      subcategories: D.array(D.recursive(() => categoryDecoder))
    }
  })

  const categoryDecoder_: D.Decoder<Category> = D.recursive(() =>
    D.object({
      required: {
        name: D.string,
        subcategories: D.array(categoryDecoder_)
      }
    })
  )

  const result = categoryDecoder_.validate(categories);
  if (result.type === "error") {
    expect(result.error.message).toStrictEqual("subcategories.0.subcategories.1.name: This is not a string: 1")
  } else {
    fail("Expected error")
  }
})
