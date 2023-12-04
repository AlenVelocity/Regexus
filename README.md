# RegExpress

Install the library using npm:

```bash
npm install regexpress
```
## Usage

```typescript
import { RegExpBuilder } from 'regexpress';

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
