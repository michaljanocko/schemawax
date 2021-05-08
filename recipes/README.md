# 🍲 Recipes

Here are some examples of handy decoders that you might use in your projects.

## Discriminated union

Suppose you have a discriminated union describing an API response:

```ts
interface Data<TData> { type: 'data', data: TData }
interface Error<TError> { type: 'error', error: TError }
type Response<TData, TError> = Data<TData> | Error<TError>
```

You can then make a custom decoder that accepts a data decoder and an error decoder like this:

```ts
export const response = <TData, TError>(decoders: { data: D.Decoder<TData>, error: D.Decoder<TError> }): D.Decoder<Response<TData, TError>> =>
  D.oneOf(
    D.object({
      required: {
        type: D.literal('data'),
        data: decoders.data
      }
    }),
    D.object({
      required: {
        type: D.literal('error'),
        error: decoders.error
      }
    })
  )
```

Somewhere else:

```ts
const decoder = response({ data: D.string, error: D.number })
type DecodedResponse = D.Output<typeof decoder> // Response<string, number>

const responseData: DecodedResponse = { type: 'data', data: 'foo' } // succeeds
const responseError: DecodedResponse = { type: 'error', error: 5 } // succeeds
const responseWrong = { type: 'error', data: 'foo' } // fails because it is of type error but has a data field
```
