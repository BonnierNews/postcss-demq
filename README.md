# PostCSS demq [![Build Status][ci-img]][ci]

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/bonniernews/postcss-demq.svg
[ci]:      https://travis-ci.org/bonniernews/postcss-demq

[PostCSS] plugin to filter media queries.

The primary use case is transforming a fully responsive stylesheet into a smaller sheet with styles for a specific device.

```css
.component { content: "generic styles" }

@media (max-width: 767px) {
  .component { content: "mobile styles" }
}

@media (min-width: 480px) and (max-width: 767px) {
  .component { content: "medium / large mobile styles" }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .component { content: "tablet styles" }
}

@media (min-width: 1024px) {
  .component { content: "desktop styles" }
}
```

Processed with options `{maxValue: 767}` will result in

```css
.component { content: "generic styles" }

.component { content: "mobile styles" }

@media (min-width: 480px) {
  .component { content: "medium / large mobile styles" }
}
```

## Features

The plugin can transform a stylesheet in the following ways:

- remove block - no intersection between mq range and option range
- preserve partial query - partial intersection between mq range and option range
- preserve query - mq range is completely within option range
- collapse block - option range is completely within mq range

> Only supports media queries based on the `width` CSS media feature

### At rules

Supports media queries in both `@media` and `@import` at rules.

### Media query syntaxes

Supports syntaxes specified by the Media Query Level 3 and 4 drafts

- prefixes `min-`, `max-`
- range comparators `<`, `>`, `=`

#### Caveat

With the level 4 syntax you may specify two conditions within the same parentheses:

```css
@import "./component.css" (200px < width < 400px);
```

Currently this will be split into two single conditions:

```css
@import "./component.css" (200px < width) and (width < 400px);
```

It was way easier.

## Usage

```js
postcss([
  require('postcss-demq')(options)
])
```

See [PostCSS] docs for examples for your environment.

### Options

#### `minValue` / `maxValue`
`Number` Specifies the range start and end of the targeted device in pixels.

Defaults to `-Infinity` / `Infinity`.

#### `filter`
`Function` A custom filter to override processing media queries.

## Custom filtering
The `options.filter` function is called once per media query and returns processing instructions for said query.

### Parameters
- `query` A query object
  - `query.source` Media query string as authored
  - `query.conditions` A list of `condition` objects
    - `condition.source` Condition string as authored

### Return value
returns either a `queryOverride` or an array of `conditionOverrides`.

#### `queryOverride`
- `undefined` Automatically process
- `true` Preserve media query and block
- `false` Remove media query and block
- `[condition1Override, ...conditionNOverride]` Preserve block and process query conditions according to `conditionOverride` of the same index.
  A list of all `undefined` will be reinterpreted as plain `undefined`.

#### `conditionOverride`
- `undefined` Automatically process
- `true` Preserve condition
- `false` Remove condition

### Example

#### Input
```css
@media (min-width: 100px) and (max-width: 200px) {
  a { content: "removed" }
}
@media (min-width: 200px) and (max-width: 300px) {
  a { content: "preserved" }
}
@media (min-width: 300px) and (max-width: 400px) {
  a { content: "partially preserved" }
}
@media (min-width: 400px) and (max-width: 500px) {
  a { content: "collapsed" }
}
@media (min-width: 600px) and (max-width: 700px) {
  a { content: "automatically processed" }
}
```

#### Options
```js
export default {
  maxValue: 700,
  filter: (query) {
    switch (query.source) {
      case '(min-width: 100px) and (max-width: 200px)':
        return false;
      case '(min-width: 200px) and (max-width: 300px)':
        return true;
      case '(min-width: 300px) and (max-width: 400px)':
        return [false, true];
      case '(min-width: 400px) and (max-width: 500px)':
        return [false, false];
      default:
        return undefined;
    }
  }
}
```

#### Output
```css
@media (min-width: 200px) and (max-width: 300px) {
  a { content: "preserved" }
}
@media (max-width: 400px) {
  a { content: "partially preserved" }
}

a { content: "collapsed" }

@media (min-width: 600px) {
  a { content: "automatically processed" }
}
```
