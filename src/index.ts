interface Decoder<D> {
  readonly decode: (data: unknown) => D
}

class DecoderError extends SyntaxError {}

const show = (data: unknown): string => JSON.stringify(data, null, 2)

const checkDefined = (data: unknown): data is null | undefined => {
  if (data === null || data === undefined) {
    throw new DecoderError('Data is missing')
  }

  return false
}

const primitiveDecoder = <D>(
  condition: (data: unknown) => data is D,
  dataType: string
): Decoder<D> => ({
    decode: (data) => {
      checkDefined(data)

      if (!condition(data)) {
        throw new DecoderError(`This is not a ${dataType}: ${show(data)}`)
      }

      return data
    }
  })

export const unknown: Decoder<unknown> = {
  decode: (data) => data
}

export const string = primitiveDecoder<string>(
  ($): $ is string => typeof $ === 'string',
  'string'
)

export const number = primitiveDecoder<number>(
  ($): $ is number => typeof $ === 'number',
  'number'
)

export const boolean = primitiveDecoder<boolean>(
  ($): $ is boolean => typeof $ === 'boolean',
  'boolean'
)

export const literal = (types: unknown[]): Decoder<unknown> => ({
  decode: (data) => {
    if (types.some($ => $ === data)) {
      return data
    }

    throw new DecoderError(
      `None of these [${types.map($ => JSON.stringify($)).join(' | ')}] match this: ${show(data)}`
    )
  }
})

export const nullable = <D>(decoder: Decoder<D>): Decoder<null | D> => ({
  decode: (data) => {
    if (data === null) {
      return null
    }

    return decoder.decode(data)
  }
})

export const array = <D>(decoder: Decoder<D>): Decoder<D[]> => ({
  decode: (data) => {
    checkDefined(data)

    if (!Array.isArray(data)) {
      throw new DecoderError(`This is not an array: ${show(data)}`)
    }

    return data.map($ => decoder.decode($))
  }
})

export const record = <D>(decoder: Decoder<D>): Decoder<Record<string, D>> => ({
  decode: (data) => {
    checkDefined(data)

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new DecoderError(`This is not an object: ${show(data)}`)
    }

    const keys = Object.keys(data)

    if (keys.every(key => typeof key === 'string')) {
      throw new DecoderError(`Not every key in here is a string: ${show(data)}`)
    }

    const parsed: Record<string, D> = {}
    keys.forEach(key => {
      parsed[key] = decoder.decode(data[key as keyof typeof data])
    })

    return parsed
  }
})
