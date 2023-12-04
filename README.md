# RegExus

Human Readable Regular Expressions for JS/TS

Port of [`regexpbuilderphp`](https://github.com/gherkins/regexpbuilderphp)


## Usage

### via NPM

```bash
npm install regexus
```

```typescript
import { RegExpBuilder } from 'regexus'; // esm
// or
const { RegExpBuilder } = require('regexus'); // commonjs
```

### via CDN
```html
<script src="https://cdn.jsdelivr.net/npm/regexus@0.0.2/dist/regexus.umd.js"></script>
```

### Example

```typescript
const builder = new RegExpBuilder()
  .startOfInput()
  .exactly(3).digits()
  .then('-')
  .min(2).max(5).letters()
  .endOfInput();

const regExp = builder.getRegExp();
const testString = '123-abcde';

if (regExp.test(testString)) {
  console.log('The string matches the pattern!');
} else {
  console.log('No match found.');
}
```

## API Reference

Coming soon

## Contributing
 
Contributions are welcome! Please open a pull request or an issue if you would like to contribute. 
