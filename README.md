# 🧬 Schemawax

Schemawax is a tool for creating typed decoders to help you get to the DNA of your data.

To add `schemawax` to your project, do:
```bash
# NPM
npm install schemawax
# Yarn
yarn add schemawax
```

## 📋 How to use

I recommend checking out some examples to get an idea of what this library can do for you. _(spoiler: a lot)_

**You can start in a couple of simple steps!**

Build a decoder:

```typescript
import * as D from 'schemawax'

const userDecoder = D.object({
  required: {
    name: D.string,
    preferredName: D.nullable(D.string),
    emailVerified: D.boolean
  }
})

// You can get the shape of the data into a type, use Output<…>
type User = D.Output<typeof userDecoder>
```

Get your data:

```typescript
// Usually, you would probably do 'JSON.parse(response)' or something
const data = {
  name: 'Bob',
  preferredName: null,
  emailVerified: false
}
```

Decode your data:

```typescript
const parsed = userDecoder.decode(data)

if (parsed) {
  console.log(parsed)
} else {
  console.log('Failed to decode')
}
```