const postcss = require('postcss')

const plugin = require('./')

function run (input, opts) {
  return postcss([plugin(opts)])
    .process(input, {
      from: undefined
    })
    .then(result => {
      expect(result.warnings()).toHaveLength(0)
      return result.css
    })
}

it('leaves unscoped css untouched', async () => {
  let input = 'body { margin: 0 }'
  let result = await run(input, {})
  expect(result).toEqual(input)
})

const minWidthVariants = ['(width >= N)', '(N <= width)', '(min-width: N)']
minWidthVariants.forEach(description => {
  describe(`@media ${description}`, () => {
    let condition = description.replace('N', '480px')
    let input = `/* outside */ @media ${condition} { /* inside */ }`

    it('removes block with min-width greater than option max-width', async () => {
      let result = await run(input, { maxWidth: 320 })
      expect(result).toEqual('/* outside */')
    })

    it('removes query with min-width lesser than option', async () => {
      let result = await run(input, { minWidth: 768 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('removes query with min-width equal to option', async () => {
      let result = await run(input, { minWidth: 480 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('preserves query with min-width greater than option', async () => {
      let result = await run(input, { minWidth: 320 })
      expect(result).toEqual(input)
    })
  })
})

const maxWidthVariants = ['(width <= N)', '(N >= width)', '(max-width: N)']
maxWidthVariants.forEach(description => {
  describe(`@media ${description}`, () => {
    let condition = description.replace('N', '480px')
    let input = `/* outside */ @media ${condition} { /* inside */ }`

    it('preserves query with max-width lesser than option', async () => {
      let result = await run(input, { maxWidth: 768 })
      expect(result).toEqual(input)
    })

    it('removes query with max-width equal to option', async () => {
      let result = await run(input, { maxWidth: 480 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('removes query with max-width greater than option', async () => {
      let result = await run(input, { maxWidth: 320 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('removes block with max-width lesser than option min-width', async () => {
      let result = await run(input, { minWidth: 768 })
      expect(result).toEqual('/* outside */')
    })
  })
})

const minMaxWidthVariants = [
  '(width => N1) and (width <= N2)',
  '(min-width: N1) and (max-width: N2)'
  // '(N1 <= width =< N2)'
]
minMaxWidthVariants.forEach(description => {
  describe(`@media ${description}`, () => {
    let conditions = description.replace('N1', '768px').replace('N2', '1024px')
    let [condition1, condition2] = conditions.split(' and ')
    let input = `/* outside */ @media ${conditions} { /* inside */ }`

    describe('opts.minWidth && opts.maxWidth', () => {
      it('removes query with min-width and max-width equal to option', async () => {
        let result = await run(input, { minWidth: 768, maxWidth: 1024 })
        expect(result).toEqual('/* outside */ /* inside */')
      })

      it('preserves partial query when lower overlap', async () => {
        let result = await run(input, { minWidth: 480, maxWidth: 960 })
        expect(result).toEqual(
          `/* outside */ @media ${condition1} { /* inside */ }`
        )
      })

      it('preserves partial query when higher overlap', async () => {
        let result = await run(input, { minWidth: 960, maxWidth: 1280 })
        expect(result).toEqual(
          `/* outside */ @media ${condition2} { /* inside */ }`
        )
      })

      it('preserves query with min-width and max-width within option', async () => {
        let result = await run(input, { minWidth: 480, maxWidth: 1280 })
        expect(result).toEqual(input)
      })
    })

    describe('opts.minWidth', () => {
      it('preserves query max-width condition when no option', async () => {
        let result = await run(input, { minWidth: 768 })
        expect(result).toEqual(
          `/* outside */ @media ${condition2} { /* inside */ }`
        )
      })
    })

    describe('opts.maxWidth', () => {
      it('preserves query min-width condition when no option', async () => {
        let result = await run(input, { maxWidth: 1024 })
        expect(result).toEqual(
          `/* outside */ @media ${condition1} { /* inside */ }`
        )
      })
    })
  })
})
