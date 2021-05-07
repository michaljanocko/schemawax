# 🧬 Schemawax

Schemawax is a tool for creating typed decoders to help you get to the DNA of your data.

To add `schemawax` to your project, do:

``` bash
# NPM
npm install schemawax
# Yarn
yarn add schemawax
```

**Similar projects and differences:**

- `io-ts` – Schemawax is much much smaller and doesn't require the humongous `fp-ts` library

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

// You can get the shape of the data into a type, use Output<…>
type User = D.Output<typeof userDecoder>
```

Get your data:

``` ts
// Usually, you would probably do 'JSON.parse(response)' or something
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

The decoders are fully typed so you can be confidently use your data in TypeScript.

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
- [Combinators](#combinators)
  - [`D.oneOf`](#doneof)
  - [`D.tuple`](#dtuple)
  - `D.array`
  - `D.record`
  - `D.keyValuePairs`
  - `D.object`
- _Decoder_`.andThen` & chaining

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

Literal decoder only decodes the exact same value (compared using `===`)

```ts
D.literal('data').decode('data') // 'data'
D.literal('error').decode('error') // 'error'
D.literal(0).decode(0) // 0

D.literal('data').decode('error') // null
D.literal(0).decode(1) // null
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
```
