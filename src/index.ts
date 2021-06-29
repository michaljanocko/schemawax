interface Decode<D> {
  readonly forceDecode: (data: unknown) => D
}

export interface Decoder<D> {
  readonly forceDecode: Decode<D>['forceDecode']
  readonly decode: (data: unknown) => ReturnType<Decode<D>['forceDecode']> | null
  readonly validate: (data: unknown) => DecodingResult<D>
  readonly is: (data: unknown) => data is D
  readonly andThen: <T>(transformer: (data: D) => T) => Decoder<T>
}

export type DecodingResult<D> =
  | { type: 'Ok', data: D }
  | { type: 'Error', error: DecoderError }

export type Output<T extends Decoder<any>> = ReturnType<T['forceDecode']>

export const createDecoder = <D>(decoder: Decode<D>): Decoder<D> => ({
  ...decoder,
  decode: (data) => {
    try {
      return decoder.forceDecode(data)
    } catch {
      return null
    }
  },
  validate: (data) => {
    try {
      return { type: 'Ok', data: decoder.forceDecode(data) }
    } catch (e) {
      if (!(e instanceof DecoderError)) {
        throw e
      }
      return { type: 'Error', error: e }
    }
  },
  is: (data): data is D => {
    try {
      decoder.forceDecode(data)
      return true
    } catch {
      return false
    }
  },
  andThen: (transformer) => {
    return createDecoder({
      forceDecode: (data: unknown) => transformer(decoder.forceDecode(data))
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
  forceDecode: (data) => data === null ? null : decoder.forceDecode(data)
})

const primitiveDecoder = <D>(
  dataType: string,
  condition: (data: unknown) => data is D
): Decoder<D> => createDecoder({
    forceDecode: (data) => {
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
  forceDecode: (data) => data
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

export const literal = <D extends string | number | boolean>(literal: D): Decoder<D> => createDecoder({
  forceDecode: (data) => {
    checkDefined(data)
    if (data !== literal) {
      throw new DecoderError(
        `Data does not match the literal. Expected: '${literal as string}', actual: '${show(data)}'`
      )
    }
    return data as D
  }
})

export const oneOf = <D extends readonly any[]>(
  ...decoders: { [K in keyof D]: Decoder<D[K]> }
): Decoder<D[number]> => createDecoder({
    forceDecode: (data) => {
      const errors = []
      for (const decoder of decoders) {
        try {
          return decoder.forceDecode(data)
        } catch (e) {
          errors.push(Object.prototype.hasOwnProperty.call(e, 'message') ? e.message : 'Unknown error')
        }
      }

      throw new DecoderError(`Could not match any of the decoders, not matched: \n${show(errors)}`)
    }
  })

export const literalUnion = <D extends ReadonlyArray<string | number | boolean>>(...decoders: D): Decoder<D[number]> =>
  oneOf(...decoders.map(literal))

//
// Arrays
//

function checkArrayType (data: unknown): asserts data is any[] {
  if (!Array.isArray(data)) throw new DecoderError(`This is not an array: ${show(data)}`)
}

export const array = <D>(decoder: Decoder<D>): Decoder<D[]> => createDecoder({
  forceDecode: (data) => {
    checkDefined(data)
    checkArrayType(data)
    return data.map(decoder.forceDecode)
  }
})

export const tuple = <D extends readonly unknown[]>(
  ...decoders: { [K in keyof D]: Decoder<D[K]> }
): Decoder<D> => createDecoder({
    forceDecode: (data) => {
      checkDefined(data)
      checkArrayType(data)
      if (decoders.length > data.length) {
        throw new DecoderError(
          `Tuple missing elements. ${decoders.length} > ${data.length}`
        )
      }

      return decoders.map((decoder, index) =>
        decoder.forceDecode(data[index])
      ) as any as D
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
  forceDecode: (data) => {
    checkDefined(data)
    checkDictType(data)
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, decoder.forceDecode(value)])
    )
  }
})

export const keyValuePairs = <D>(decoder: Decoder<D>): Decoder<Array<[string, D]>> => createDecoder({
  forceDecode: (data) => Object.entries(record(decoder).forceDecode(data))
})

//
// Objects
//

type DecoderRecord = Record<PropertyKey, Decoder<any>>
type OmitEmptyPartial<T extends DecoderRecord> = T extends infer U & Partial<{ [x: string]: any }> ? U : never
type ObjectType<D extends DecoderRecord> = D extends { [K in keyof infer U]: Decoder<(infer U)[K]> } ? U : never

const required = <D extends DecoderRecord>(
  struct: D
): Decoder<ObjectType<D>> => createDecoder({
    forceDecode: (data) => {
      checkDictType(data)

      const parsed: Partial<ObjectType<D>> = {}

      for (const key in struct) {
        if (data[key] === undefined) throw new DecoderError(`Object missing required property '${key}'`)
        parsed[key] = struct[key].forceDecode(data[key])
      }

      return parsed as ObjectType<D>
    }
  })

const partial = <D extends DecoderRecord>(
  struct: D
): Decoder<Partial<ObjectType<D>>> => createDecoder({
    forceDecode: (data) => {
      checkDictType(data)

      const parsed: Partial<ObjectType<D>> = {}

      for (const key in struct) {
        if (data[key] !== undefined) {
          parsed[key] = struct[key].forceDecode(data[key])
        }
      }

      return parsed
    }
  })

export const object = <D extends DecoderRecord, E extends DecoderRecord>(
  struct: {
    required?: D
    optional?: E
  }
): Decoder<OmitEmptyPartial<ObjectType<D> & Partial<ObjectType<E>>>> => createDecoder({
    forceDecode: (data) => {
      checkDefined(data)

      const result: Partial<OmitEmptyPartial<ObjectType<D> & Partial<ObjectType<E>>>> = {}
      if (struct.required !== undefined) {
        Object.assign(result, required(struct.required).forceDecode(data))
      }
      if (struct.optional !== undefined) {
        Object.assign(result, partial(struct.optional).forceDecode(data))
      }
      return result as OmitEmptyPartial<ObjectType<D> & Partial<ObjectType<E>>>
    }
  })
