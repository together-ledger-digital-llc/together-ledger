# Show Password Kit

A portable kit for adding a "show password" button to password inputs.

## What it does

It exports a function that attaches an accessible "show password" toggle button to a password field.
The toggle lets a person read the password they are typing to verify it. Hidden is always the default.
The field is returned to hidden when its form is submitted, when the page is left, and when the dialog around it closes. Note that the button does not report an `aria-pressed` state because its label changes from "Show password" to "Hide password".

## How to use it

Copy `show-password.js` to the destination app. Import it, and call it with the `HTMLInputElement` and a translation function `t(key)`. The `t` function should return the translation for `common.password.show` and `common.password.hide`. You will also need to add CSS styling in the target application.

```javascript
import { showPassword } from './a11y/show-password/show-password.js';

const passwordField = document.querySelector('input[name="password"]');
showPassword(passwordField, t);
```
