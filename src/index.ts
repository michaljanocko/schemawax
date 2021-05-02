interface Decoder<D> {
  readonly decode: (data: unknown) => D
}

type ElementType<A extends readonly any[]> = A extends ReadonlyArray<infer T> ? T : never

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
  decode: (data: unknown) => data
}

export const string = primitiveDecoder<string>(
  ($): $ is string => typeof $ === 'string', 'string'
)

export const number = primitiveDecoder<number>(
  ($): $ is number => typeof $ === 'number' && Number.isFinite($), 'number'
)

export const boolean = primitiveDecoder<boolean>(
  ($): $ is boolean => typeof $ === 'boolean', 'boolean'
)

export const literal = <T extends readonly any[]>(types: T): Decoder<ElementType<T>> => ({
  decode: (data: unknown) => {
    if (!types.some($ => $ === data)) {
      throw new DecoderError(
        `None of these [${types.map($ => JSON.stringify($)).join(' | ')}] match this: ${show(data)}`
      )
    }

    return data as ElementType<T>
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

export const pair = <D, E>(
  pair: [Decoder<D>, Decoder<E>],
  strict: boolean = false
): Decoder<[D, E]> => ({
    decode: (data: unknown) => {
      checkDefined(data)
      if (!Array.isArray(data)) {
        throw new DecoderError(`This is not a tuple: ${show(data)}`)
      } else if (strict && data.length !== 2) {
        throw new DecoderError(`This is not an array of two: ${show(data)}`)
      } else if (data.length < 2) {
        throw new DecoderError(`Not enough elements for a pair: ${show(data)}`)
      }

      return [
        pair[0].decode(data[0]),
        pair[1].decode(data[1])
      ]
    }
  })

export const triplet = <D, E, F>(
  pair: [Decoder<D>, Decoder<E>, Decoder<F>],
  strict: boolean = false
): Decoder<[D, E, F]> => ({
    decode: (data: unknown) => {
      checkDefined(data)
      if (!Array.isArray(data)) {
        throw new DecoderError(`This is not a tuple: ${show(data)}`)
      } else if (strict && data.length !== 3) {
        throw new DecoderError(`This is not an array of three: ${show(data)}`)
      } else if (data.length < 3) {
        throw new DecoderError(`Not enough elements for a triplet: ${show(data)}`)
      }

      return [
        pair[0].decode(data[0]),
        pair[1].decode(data[1]),
        pair[2].decode(data[2])
      ]
    }
  })

const checkDictType = (data: unknown): data is { [key: string]: any } => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new DecoderError(`This is not an object: ${show(data)}`)
  }

  return true
}

export const record = <D>(decoder: Decoder<D>): Decoder<Record<string, D>> => ({
  decode: (data) => {
    checkDefined(data)
    checkDictType(data)
    const dataObject = data as { [key: string]: D }

    const parsed: Record<string, D> = {}

    let key: keyof typeof dataObject
    for (key in dataObject) {
      parsed[key] = decoder.decode(dataObject[key])
    }

    return parsed
  }
})

export const keyValuePairs = <D>(decoder: Decoder<D>): Decoder<Array<[string, D]>> => ({
  decode: (data) => Object.entries(record(decoder).decode(data))
})

export const object = <D>(
  struct: { [K in keyof D]: Decoder<D[K]> }
): Decoder<{ [K in keyof D]: D[K] }> => ({
    decode: (data) => {
      checkDefined(data)
      checkDictType(data)
      const dataObject = data as { [key: string]: D }

      const parsed: { [K in keyof D]?: D[K] } = {}

      let key: keyof typeof struct
      for (key in struct) {
        const dataField = dataObject?.[key as string]

        if (dataField === undefined) {
          throw new DecoderError(`Missing key: ${show(key)}`)
        }

        parsed[key] = struct[key].decode(dataField)
      }

      return parsed as { [K in keyof D]: D[K] }
    }
  })
