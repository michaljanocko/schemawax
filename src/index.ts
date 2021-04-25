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

// export const tuple = <D extends ReadonlyArray<Decoder<unknown>>>(
//   tuple: { [K in keyof D]: Decoder<D[K]> }
// ): Decoder<D> => ({
//     decode: (data, strict: boolean = true) => {
//       checkDefined(data)
//       if (!Array.isArray(data)) {
//         throw new DecoderError(`This is not an array: ${show(data)}`)
//       }

//       return data
//     }
//   })

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
