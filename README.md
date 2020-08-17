# PostCSS demq [![Build Status][ci-img]][ci]

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/bonniernews/postcss-demq.svg
[ci]:      https://travis-ci.org/bonniernews/postcss-demq

[PostCSS] plugin to filter media queries.

Primary use case is transforming a fully responsive stylesheet into a smaller sheet with styles for a specific device.

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

Plugin can transform stylesheet following ways:

- remove entire block - no intersection between mq range and option range
- preserve partial query - partial intersection between mq range and option range
- preserve query - mq range is completely within option range
- collapse query - option range is completely within mq range

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
`Number` Specifies the range start and end of the targeted device in pixels

Defaults to `-Infinity` / `Infinity`.

