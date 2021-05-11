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
})
test('D.array fails when given null or undefined', () => {
  shouldFail(D.array(D.unknown), undefined)
  shouldFail(D.array(D.unknown), null)
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

// map
test('Decoder.map changes the type after parsed', () => {
  shouldBe(D.number.map($ => $.toString()), 5, '5')
  const objectDecoder = D.object({
    required: { a: D.number },
    optional: { b: D.number }
  }).map($ => ({
    a: $.a.toString(),
    b: $.b?.toString()
  }))
  shouldBe(objectDecoder, { a: 5, b: 10 }, { a: '5', b: '10' })
  shouldBe(objectDecoder, { a: 5 }, { a: '5', b: undefined })
})
test('Decoder.map fails when the transformer fails', () => {
  shouldFail(D.unknown.map(_ => { throw new D.DecoderError() }), '')
})
test('Decoder.map fails when the decoder fails', () => {
  shouldFail(D.number.map(Number.prototype.toString), 'test')
  shouldFail(D.number.map($ => $.toString()), 'test')
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
})
