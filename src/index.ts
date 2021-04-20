interface Decoder<A> {
  readonly decode: (data: unknown) => A
}

class DecoderError extends SyntaxError {
  constructor (type: string, data: unknown) {
    super(`This is not a ${type}: ${JSON.stringify(data, null, 2)}`)
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
      throw new DecoderError('string', data)
    }
  }
}

export const number: Decoder<number> = {
  decode: (data) => {
    if (typeof data === 'number') {
      return data
    } else {
      throw new DecoderError('number', data)
    }
  }
}

export const boolean: Decoder<boolean> = {
  decode: (data) => {
    if (typeof data === 'boolean') {
      return data
    } else {
      throw new DecoderError('boolean', data)
    }
  }
}
