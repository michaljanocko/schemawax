interface Decode<D> {
  readonly decode: (data: unknown) => D
}

export interface Decoder<D> {
  readonly decode: Decode<D>['decode']
  readonly is: (data: unknown) => data is D
  readonly andThen: <T>(transformer: (data: D) => T) => Decoder<T>
}

export type Output<T extends Decoder<any>> = ReturnType<T['decode']>

export const createDecoder = <D>(decoder: Decode<D>): Decoder<D> => ({
  ...decoder,
  is: (data): data is D => {
    try {
      decoder.decode(data)
      return true
    } catch {
      return false
    }
  },
  andThen: (transformer) => {
    return createDecoder({
      decode: (data: unknown) => transformer(decoder.decode(data))
    })
  }
})

export class DecoderError extends SyntaxError {
  constructor (message?: string) {
    super(message)
    this.name = 'DecoderError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

const show = (data: unknown): string => JSON.stringify(data, null, 2)

/**
 * Throws if data is null or undefined
 */
export const checkDefined = (data: unknown): data is null | undefined => {
  if (data == null) throw new DecoderError('This value is not there')
  return false
}

/**
 * If the data is null return null
 * else, pass to the decoder where 'checkDefined'
 * fails only when data is undefined
 */
export const nullable = <D>(decoder: Decoder<D>): Decoder<null | D> => createDecoder({
  decode: (data) => data === null ? null : decoder.decode(data)
})

const primitiveDecoder = <D>(
  dataType: string,
  condition: (data: unknown) => data is D
): Decoder<D> => createDecoder({
    decode: (data) => {
      checkDefined(data)
      if (!condition(data)) {
        throw new DecoderError(`This is not ${dataType}: ${show(data)}`)
      }
      return data
    }
  })

//
// Primitives
//

export const unknown = createDecoder({
  decode: (data) => data
})

export const string = primitiveDecoder<string>(
  'a string', ($): $ is string => typeof $ === 'string'
)

export const number = primitiveDecoder<number>(
  'a number', ($): $ is number => typeof $ === 'number' && Number.isFinite($)
)

export const boolean = primitiveDecoder<boolean>(
  'a boolean', ($): $ is boolean => typeof $ === 'boolean'
)

export const oneOf = <D extends readonly any[]>(
  ...decoders: { [K in keyof D]: Decoder<D[K]> }
): Decoder<D[number]> => createDecoder({
    decode: (data) => {
      const errors = []
      for (const decoder of decoders) {
        try {
          return decoder.decode(data)
        } catch (e) {
          errors.push(Object.prototype.hasOwnProperty.call(e, 'message') ? e.message : 'Unknown error')
        }
      }

      throw new DecoderError(`Could not match any of the decoders, not matched: \n${show(errors)}`)
    }
  })

//
// Arrays
//

function checkArrayType (data: unknown): asserts data is any[] {
  if (!Array.isArray(data)) throw new DecoderError(`This is not an array: ${show(data)}`)
}

export const array = <D>(decoder: Decoder<D>): Decoder<D[]> => createDecoder({
  decode: (data) => {
    checkDefined(data)
    checkArrayType(data)
    return data.map(decoder.decode)
  }
})

export const tuple = <D extends readonly unknown[]>(
  ...decoders: { [K in keyof D]: Decoder<D[K]> }
): Decoder<D> => createDecoder({
    decode: (data) => {
      checkDefined(data)
      checkArrayType(data)
      if (decoders.length > data.length) {
        throw new DecoderError(
          `Tuple missing elements. ${decoders.length} > ${data.length}`
        )
      }

      return decoders.map((decoder, index) => decoder.decode(data[index])) as any as D
    }
  })

//
// Dicts
//

function checkDictType (data: unknown): asserts data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new DecoderError(`This is not an object: ${show(data)}`)
  } else if (Object.keys(data).some($ => typeof $ !== 'string')) {
    throw new DecoderError(`Not all keys in this object are strings: ${show(data)}`)
  }
}

export const record = <D>(decoder: Decoder<D>): Decoder<Record<string, D>> => createDecoder({
  decode: (data) => {
    checkDefined(data)
    checkDictType(data)
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, decoder.decode(value)])
    )
  }
})

export const keyValuePairs = <D>(decoder: Decoder<D>): Decoder<Array<[string, D]>> => createDecoder({
  decode: (data) => Object.entries(record(decoder).decode(data))
})

//
// Objects
//

const required = <D>(
  struct: { [K in keyof D]: Decoder<D[K]> }
): Decoder<{ [K in keyof D]: D[K] }> => createDecoder({
    decode: (data) => {
      checkDictType(data)

      const parsed: { [K in keyof D]?: D[K] } = {}

      let key: keyof typeof struct
      for (key in struct) {
        if (data[key as string] === undefined) throw new DecoderError(`Object missing required property '${key as string}'`)
        parsed[key] = struct[key].decode(data[key as string])
      }

      return parsed as { [K in keyof D]: D[K] }
    }
  })

const partial = <D>(
  struct: { [K in keyof D]: Decoder<D[K]> }
): Decoder<Partial<{ [K in keyof D]: D[K] }>> => createDecoder({
    decode: (data) => {
      checkDictType(data)

      const parsed: { [K in keyof D]?: D[K] } = {}

      let key: keyof typeof struct
      for (key in struct) {
        if (data[key as string] !== undefined) {
          parsed[key] = struct[key].decode(data[key as string])
        }
      }

      return parsed as Partial<{ [K in keyof D]: D[K] }>
    }
  })

export const object = <D, E>(
  struct: {
    required?: { [K in keyof D]: Decoder<D[K]> }
    optional?: { [L in keyof E]: Decoder<E[L]> }
  }
): Decoder<{ [K in keyof D]: D[K] } & Partial<{ [L in keyof E]: E[L] }>> => createDecoder({
    decode: (data) => {
      checkDefined(data)
      return {
        ...required((struct.required ?? {}) as { [K in keyof D]: Decoder<D[K]> }).decode(data),
        ...partial((struct.optional ?? {}) as { [L in keyof E]: Decoder<E[L]> }).decode(data)
      }
    }
  })

export const literal = <D extends string>(literal: D): Decoder<D> => createDecoder({
  decode: (data) => {
    checkDefined(data)
    if (data !== literal) throw new DecoderError(`Data does not match the literal. Expected: '${literal}', actual: '${show(data)}'`)
    return data as D
  }
})
