interface Decoder<A> {
  readonly decode: (data: unknown) => A
}

class DecoderError extends SyntaxError {
  constructor (data: unknown, type: string) {
    super(`This is not ${type}: ${JSON.stringify(data, null, 2)}`)
  }
}

export const unknown: Decoder<unknown> = {
  decode: (data) => data
}

export const string: Decoder<string> = {
  decode: (data) => {
    if (typeof data === 'string') {
      return data
    } else {
      throw new DecoderError(data, 'a string')
    }
  }
}

export const number: Decoder<number> = {
  decode: (data) => {
    if (typeof data === 'number') {
      return data
    } else {
      throw new DecoderError(data, 'a number')
    }
  }
}

export const boolean: Decoder<boolean> = {
  decode: (data) => {
    if (typeof data === 'boolean') {
      return data
    } else {
      throw new DecoderError(data, 'a boolean')
    }
  }
}

export const literal = (types: unknown[]): Decoder<unknown> => ({
  decode: (data) => {
    if (types.some($ => $ === data)) {
      return data
    } else {
      throw new DecoderError(data, `in [${types.map($ => JSON.stringify($)).join(' | ')}]`)
    }
  }
})
