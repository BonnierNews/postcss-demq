var postcss = require('postcss')
var plugin = require('./')

function run (input, opts) {
  return postcss([plugin(opts)])
    .process(input)
    .then(function (result) {
      expect(result.warnings()).toHaveLength(0)
      return result.css
    })
}

it('leaves unscoped css untouched', async function () {
  var input = '' +
    'body { margin: 0 }'

  var result = await run(input, {})

  expect(result).toEqual(input)
})

describe('@media (min-width)', function () {
  var input = '' +
    '/* outside */' +
    '@media (min-width: 480px) {' +
    '  /* inside */' +
    '}'

  it('removes block with min-width greater than option max-width', async function () {
    var result = await run(input, { maxWidth: 320 })
    expect(result).toEqual('/* outside */')
  })

  it('removes query with min-width lesser than option', async function () {
    var result = await run(input, { minWidth: 768 })
    expect(result).toEqual('/* outside *//* inside */')
  })

  it('removes query with min-width equal to option', async function () {
    var result = await run(input, { minWidth: 480 })
    expect(result).toEqual('/* outside *//* inside */')
  })

  it('preserves query with min-width greater than option', async function () {
    var result = await run(input, { minWidth: 320 })
    expect(result).toEqual(input)
  })
})

describe('@media (max-width)', function () {
  var input = '' +
    '/* outside */' +
    '@media (max-width: 480px) {' +
    '  /* inside */' +
    '}'

  it('preserves query with max-width lesser than option', async function () {
    var result = await run(input, { maxWidth: 768 })
    expect(result).toEqual(input)
  })

  it('removes query with max-width equal to option', async function () {
    var result = await run(input, { maxWidth: 480 })
    expect(result).toEqual('/* outside *//* inside */')
  })

  it('removes query with max-width greater than option', async function () {
    var result = await run(input, { maxWidth: 320 })
    expect(result).toEqual('/* outside *//* inside */')
  })

  it('removes block with max-width lesser than option min-width', async function () {
    var result = await run(input, { minWidth: 768 })
    expect(result).toEqual('/* outside */')
  })
})

describe('@media (min-width) and (max-width)', function () {
  var input = '' +
    '/* outside */' +
    '@media (min-width: 768px) and (max-width: 1024px) {' +
    '  /* inside */' +
    '}'

  describe('opts.minWidth && opts.maxWidth', function () {
    it('removes query with min-width and max-width equal to option', async function () {
      var result = await run(input, { minWidth: 768, maxWidth: 1024 })
      expect(result).toEqual('/* outside *//* inside */')
    })

    it('preserves partial query when lower overlap', async function () {
      var result = await run(input, { minWidth: 480, maxWidth: 960 })
      expect(result).toEqual('/* outside */@media (min-width: 768px) {  /* inside */}')
    })

    it('preserves partial query when higher overlap', async function () {
      var result = await run(input, { minWidth: 960, maxWidth: 1280 })
      expect(result).toEqual('/* outside */@media (max-width: 1024px) {  /* inside */}')
    })

    it('preserves query with min-width and max-width within option', async function () {
      var result = await run(input, { minWidth: 480, maxWidth: 1280 })
      expect(result).toEqual(input)
    })
  })

  describe('opts.minWidth', function () {
    it('preserves query max-width condition when no option', async function () {
      var result = await run(input, { minWidth: 768 })
      expect(result).toEqual('/* outside */@media (max-width: 1024px) {  /* inside */}')
    })
  })

  describe('opts.maxWidth', function () {
    it('preserves query min-width condition when no option', async function () {
      var result = await run(input, { maxWidth: 1024 })
      expect(result).toEqual('/* outside */@media (min-width: 768px) {  /* inside */}')
    })
  })
})
