interface Decoder<D> {
  readonly decode: (data: unknown) => D
}

class DecoderError extends SyntaxError {
  constructor (error: 'missing' | 'wrongType', data: unknown, type: string) {
    if (error === 'missing') {
      super(`Property of type ${type} is missing`)
    } else {
      super(`This is not ${type}: ${JSON.stringify(data, null, 2)}`)
    }
  }
}

export const unknown: Decoder<unknown> = {
  decode: (data) => data
}

const decoder = <D>(condition: (data: unknown) => data is D, parser: (data: D) => D, type: string): Decoder<D> => ({
  decode: (data) => {
    if (data === null || data === undefined) {
      throw new DecoderError('missing', data, type)
    }

    if (!condition(data)) {
      throw new DecoderError('wrongType', data, type)
    }

    return parser(data)
  }
})

export const string = decoder<string>(
  ($): $ is string => typeof $ === 'string',
  ($) => $,
  'a string'
)

export const number = decoder<number>(
  ($): $ is number => typeof $ === 'number',
  ($) => $,
  'a number'
)

export const boolean = decoder<boolean>(
  ($): $ is boolean => typeof $ === 'boolean',
  ($) => $,
  'a boolean'
)

// export const literal = (types: unknown[]): Decoder<unknown> => ({
//   decode: (data) => {
//     if (types.some($ => $ === data)) {
//       return data
//     } else {
//       throw new DecoderError(data, `in [${types.map($ => JSON.stringify($)).join(' | ')}]`)
//     }
//   }
// })

// export const nullable = <A>(decoder: Decoder<A>): Decoder<null | A> => ({
//   decode: (data) => {
//     if (data === null) {
//       return null
//     } else {
//       return decoder.decode(data)
//     }
//   }
// })

// export const array = <A>(decoder: Decoder<A>): Decoder<A[]> => ({
//   decode: (data) => {
//     if (Array.isArray(data)) {
//       return data.map($ => decoder.decode($))
//     } else {
//       throw new DecoderError(data, 'an array')
//     }
//   }
// })

// export const record = <A>(decoder: Decoder<A>): Decoder<Record<string, A>> => ({
//   decode: (data) => {
//     if (typeof data === 'object') {
//       return Object.entries(data).map([key, value] => )
//     } else {
//       throw new DecoderError(data, 'an object')
//     }
//   }
// })
