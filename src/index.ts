interface Decode<D> {
  readonly forceDecode: (data: unknown) => D
}

export interface Decoder<D> {
  readonly forceDecode: Decode<D>['forceDecode']
  readonly decode: (data: unknown) => ReturnType<Decode<D>['forceDecode']> | null
  readonly validate: (data: unknown) => ValidationResult<D>
  readonly is: (data: unknown) => data is D
  readonly andThen: <T>(transformer: (data: D) => T) => Decoder<T>
}

export type ValidationResult<D> =
  | { type: 'ok', data: D }
  | { type: 'error', error: DecoderError }

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
      return { type: 'ok', data: decoder.forceDecode(data) }
    } catch (e) {
      if (e instanceof DecoderError) {
        return { type: 'error', error: e }
      }
      throw e
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
  path: string[]
  constructor (message?: string, path: string[] = []) {
    super(message)
    this.name = 'DecoderError'
    this.path = path
    Object.setPrototypeOf(this, new.target.prototype)

    if (this.path.length === 1) {
      this.message = `${this.path[0]}: ${this.message}`
    } else if (this.path.length > 1) {
      this.message = `${this.path[0]}.${this.message}`
    }
  }
}

const forceDecodeWithPath = <T>(decoder: Decoder<T>, data: unknown, pathPart: string): T => {
  try {
    return decoder.forceDecode(data)
  } catch (e) {
    if (e instanceof DecoderError) {
      throw new DecoderError(e.message, [pathPart, ...e.path])
    } else {
      throw e
    }
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
export const nullable = <D> (decoder: Decoder<D>): Decoder<null | D> => oneOf(decoder, null_)

/**
 * A decoder that always return the same value
 * Useful for fallback values
 */
export const succeed = <T> (value: T): Decoder<T> => createDecoder({
  forceDecode: () => value
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

const null_ = createDecoder({
  forceDecode: (data) => {
    if (data === null) {
      return data
    } else {
      throw new DecoderError('Provided value is not null.')
    }
  }
})
export { null_ as null }

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
        `Data does not match the literal. Expected: '${literal as string}', actual value: '${show(data)}'`
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
        } catch (e: any) {
          errors.push(e.message ?? 'Unknown error')
        }
      }

      throw new DecoderError(`None of the decoders worked:\n${show(errors)}`)
    }
  })

export const literalUnion = <D extends ReadonlyArray<string | number | boolean>>(...decoders: D): Decoder<D[number]> =>
  oneOf(...decoders.map(literal))

export const regex = (regex: RegExp): Decoder<string> =>
  string.andThen(data => {
    if (!regex.test(data)) throw new DecoderError(`Data '${data}' does not satisfy the regex '${regex.toString()}'`)

    return data
  })

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
    return data.map((x: unknown, i) => forceDecodeWithPath(decoder, x, i.toString()))
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
          `The tuple is not long enough. ${decoders.length} > ${data.length}`
        )
      }

      return decoders.map((decoder, index) =>
        forceDecodeWithPath(decoder, data[index], index.toString())
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
      Object.entries(data).map(([key, value]) => [key, forceDecodeWithPath(decoder, value, key)])
    )
  }
})

export const keyValuePairs = <D>(decoder: Decoder<D>): Decoder<Array<[string, D]>> => createDecoder({
  forceDecode: (data) => Object.entries(record(decoder).forceDecode(data))
})

//
// Objects
//

export type DecoderRecord = Record<PropertyKey, Decoder<any>>
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
        parsed[key] = forceDecodeWithPath(struct[key], data[key], key)
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
          parsed[key] = forceDecodeWithPath(struct[key], data[key], key)
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

export const recursive = <D>(decoder: () => Decoder<D>): Decoder<D> => createDecoder({
  forceDecode: (data) => {
    return decoder().forceDecode(data)
  }
})
