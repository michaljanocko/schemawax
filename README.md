# 🧬 Schemawax

Schemawax is a tool for creating typed decoders to help you get to the DNA of your data.

To add `schemawax` to your project, do:

``` bash
# NPM
npm install schemawax
# Yarn
yarn add schemawax
```

## 📋 How to use

I recommend checking out some examples to get an idea of what this library can do for you. _(spoiler: a lot)_

**You can start in a couple of simple steps!**

Build a decoder:

``` ts
import * as D from 'schemawax'

const userDecoder = D.object({
  required: {
    name: D.string,
    preferredName: D.nullable(D.string),
    emailVerified: D.boolean
  }
})

// You can get the shape of the data into a type, use D.Output<…>
type User = D.Output<typeof userDecoder>
```

Get your data:

``` ts
// Usually, you would get the data using 'JSON.parse(response)' or something
const data = {
  name: 'Bob',
  preferredName: null,
  emailVerified: false
}
```

Decode your data:

``` ts
const parsed = userDecoder.decode(data)

if (parsed) {
  console.log(parsed)
} else {
  console.log('Failed to decode')
}
```

The decoders are fully typed so you can confidently use your data in TypeScript.

You can either delve into the documentation (highly recommended) or check out some of our quick [recipes](recipes/).

## 📄 Full documentation

- [Methods](#methods)
  - [_Decoder_`.decode`](#decoderdecode)
  - [_Decoder_`.forceDecode`](#decoderforcedecode)
  - [_Decoder_`.is`](#decoderis)
- [Primitives](#primitives)
  - [`D.string`](#dstring)
  - [`D.number`](#dnumber)
  - [`D.boolean`](#dboolean)
  - [`D.literal`](#dliteral)
  - [`D.literalUnion`](#dliteralunion)
- [Combinators](#combinators)
  - [`D.oneOf`](#doneof)
  - [`D.tuple`](#dtuple)
  - [`D.array`](#darray)
  - [`D.record`](#drecord)
  - [`D.keyValuePairs`](#dkeyvaluepairs)
  - [`D.object`](#dobject)
- [_Decoder_`.map` & chaining](#decoderandthen--chaining)

### Methods

Decoders can consume data through one of these methods:

#### _Decoder_`.decode`

_Decoder_`.decode` tries to decode data and if it fails, it returns `null` .

This method returns a type of `D | null` where `D` is your type. If you do not want to have the `null` in there, see below.

``` ts
D.string.decode('a string') // 'a string'
D.array(D.unknown).decode([]) // []
D.array(D.number).decode([1, 2, 3]) // [1, 2, 3]

D.string.decode(42) // null
D.array(D.unknown).decode('not an array') // null
```

#### _Decoder_`.forceDecode`

This one works the same way as the previous one but throws a `DecoderError` when it fails. You might use it if you want a top-level nullable structure (unlikely) or you just want to throw errors.

This method return a type of `D` which is the output type of your decoder.

``` ts
D.string.forceDecode('a string') // 'a string'
D.array(D.unknown).forceDecode([]) // []
D.array(D.number).forceDecode([1, 2, 3]) // [1, 2, 3]

D.string.forceDecode(42) // throws DecoderError
D.array(D.unknown).forceDecode('not an array') // throws DecoderError
```

#### _Decoder_`.is`

This method returns true or false based on whether the decoder would fail. It also serves as a type guard.

```ts
D.string.is('string') // true

D.string.is(42) // false

// Type guard out of this
const decoder = D.array(D.boolean)
const data = [true, false]

if (decoder.is(data)) {
  // TypeScript now knows that data is an array of booleans
  data.map(console.log)
} else {
  console.log('This is not and array of booleans')
}
```

### Primitives

All primitive decoders work the same

#### `D.string`

This is a simple decoder: if the input is a string, return the string, else fail (e.g. return `null` or throw an error).

```ts
D.string.decode('a string') // 'a string'

D.string.decode(42) // null
D.string.decode({}) // null
D.string.forceDecode(false) // throws DecoderError
```

#### `D.number`

```ts
D.number.decode(42) // 42

D.number.decode('a string') // null
```

#### `D.boolean`

```ts
D.boolean.decode(true) // true

D.boolean.decode('not a boolean') // null
```

#### `D.literal`

Literal decoder only decodes the exact same value (compared using `===`).

```ts
D.literal('data').decode('data') // 'data'
D.literal('error').decode('error') // 'error'
D.literal(0).decode(0) // 0

D.literal('data').decode('error') // null
D.literal(0).decode(1) // null
```

#### `D.literalUnion`

`D.literalUnion` combines `D.literal` and `D.oneOf` the way you would expect.

```ts
const decoder = D.literalUnion('data', 'error') // D.Decoder<'data' | 'error'>

decoder.decode('data') // 'data'
decoder.decode('error') // 'error'

decoder.decode('not in there') // null
```

### Combinators

#### `D.oneOf`

This decoder tries all the decoders passed to it in order and returns the first one that succeeds.

```ts
const decoder = D.oneOf(D.string, D.number)

decoder.decode('a string') // 'a string'
decoder.decode(42) // 42

decoder.decode(false) // null
```

#### `D.tuple`

Using this you can comfortably decode TS tuples. (for example from JSON arrays)

```ts
const minMaxDecoder = D.tuple(D.number, D.number)

const data = JSON.parse('{ "minmax": [18, 99] }')
D.object({ // More on this below
  required: {
    minmax: minMaxDecoder
  }
}) // { minmax: [18, 99] }
```

`minmax` is now typed as `[number, number]` and not as `number[]`

```ts
const [firstName, lastName] = D.tuple(D.string, D.string).forceDecode(['Michael', 'Jackson'])
firstName === 'Michael' // true
lastName === 'Jackson' // true
```

Longer arrays get stripped at the end to fit the length of the tuple. Shorter arrays with not enough elements fail to decode.

#### `D.array`

The array decoder takes another decoder with which it tries to decode a whole JSON array.

```ts
D.array(D.number).decode([1, 2, 3]) // [1, 2, 3]

D.array(D.number).decode([1, 2, 'not a number']) // null
```

#### `D.record`

This decoder works the same as [`D.array`](#darray) except that it parses an object and returns `Record<string, D>`.

```ts
const decoder = D.record(D.number)

const data = {
  preschoolers: 55,
  student: 124,
  employed: 133,
  unemployed: 128,
  retired: 67
}
decoder.decode(data) // succeeds with data as 'Record<string, number>'

const wrongData = {
  preschoolers: null,
  student: '124',
  employed: 133,
  unemployed: 128,
  retired: 67
}
decoder.decode(wrongData) // fails because not all of the values are numbers
```

#### `D.keyValuePairs`

The key-value pairs decoder works the same way as [`D.record`](#drecord) but returns an array of tuples.

```ts
// e.g. with data from previous example
D.keyValuePairs(D.number).decode(data) // succeeds with data as '[[string, number]]'
```

#### `D.object`

This is probably the most important (and the most complicated?) decoder. You can decode whole typed objects like this:

```ts
const person = {
  name: 'Sarah',
  age: 25
}

const personDecoder = D.object({
  required: {
    name: D.string,
    age: D.number
  },
  optional: {
    preferredName: D.string
  }
})

personDecoder.decode(person) // succeeds
```

You pass it an object which has `required` and `optional` object with specified fields. Both `required` and `optional` are optional so if you don't have any optional field you can just omit the `optional` field and vice versa.

> Careful, `null` is not a missing value! Null is an actual value which is supposed to be handled with `D.nullable(…)`

Again, if you want the type of `personDecoder`, you can use `D.Output<…>`

```ts
type Person = D.Output<typeof personDecoder>

// The above is now equivalent to this interface
interface Person {
  name: string
  age: number
  preferredName?: string
}
```

### _Decoder_`.map` & chaining

If the built-in types in JSON aren't enough for you, you can extend the provided decoders. Let's say you want to decode a `Date` from an ISO string.

```ts
const dateDecoder = D.string.map(date => new Date(date))
// You can now use it with
// dateDecoder.decode(…)

// Amazingly, TS is smart enough to allow for this:
type DecodedDate = D.Output<typeof dateDecoder> // is actually Date! and not a string
```

> Also, if you throw an error from inside the function, the decoder fails as it would fail with a bad type or anything else!

You can use this for:
- Transforming to different types
- Renaming fields in objects
- Performing stricter checks (e.g. string length) and failing the decoder by throwing an error

> Now you can decode anything you please—you're unstoppable!

## 🍲 Recipes

**We recommend checking out some of our [examples](recipes/).**

## ♻️ Similar projects and differences

- [`io-ts`](https://github.com/gcanti/io-ts) – Schemawax is much much smaller and doesn't require the gigantic `fp-ts` library
- [`ts-auto-guard`](https://github.com/rhys-vdw/ts-auto-guard) - Takes the opposite approach and creates decoders from interfaces but requires an extra compilation step and tooling. Hard to use in non-TS projects
- [`typescript-is`](https://github.com/woutervh-/typescript-is) - Similar to `ts-auto-guard` but is a transformer for an unofficial version of the TypeScript compiler. Impossible to use without TS
