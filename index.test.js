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

const gtWidthVariants = ['(width > N)', '(N < width)']
gtWidthVariants.forEach(description => {
  let condition = description.replace('N', '480px')

  describe(`@media ${description}`, () => {
    let input = `/* outside */ @media ${condition} { /* inside */ }`

    it('removes block with min width greater than option max-width', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* outside */')
    })

    it('removes query with min width lesser than option', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('preserves query with min width equal to option', async () => {
      let result = await run(input, { minValue: 480 })
      expect(result).toEqual(input)
    })

    it('preserves query with min width greater than option', async () => {
      let result = await run(input, { minValue: 320 })
      expect(result).toEqual(input)
    })
  })

  describe(`@import "./file.css" ${description}`, () => {
    let input = `/* before */ @import "./file.css" ${condition}; /* after */`
    it('removes block with min width greater than option max-width', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* before */ /* after */')
    })

    it('removes query with min width lesser than option', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* before */ @import "./file.css"; /* after */')
    })

    it('preserves query with min width equal to option', async () => {
      let result = await run(input, { minValue: 480 })
      expect(result).toEqual(input)
    })

    it('preserves query with min width greater than option', async () => {
      let result = await run(input, { minValue: 320 })
      expect(result).toEqual(input)
    })
  })
})

const gteWidthVariants = ['(width >= N)', '(N <= width)', '(min-width: N)']
gteWidthVariants.forEach(description => {
  let condition = description.replace('N', '480px')

  describe(`@media ${description}`, () => {
    let input = `/* outside */ @media ${condition} { /* inside */ }`

    it('removes block with min width greater than option max width', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* outside */')
    })

    it('removes query with min width lesser than option', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('removes query with min width equal to option', async () => {
      let result = await run(input, { minValue: 480 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('preserves query with min width greater than option', async () => {
      let result = await run(input, { minValue: 320 })
      expect(result).toEqual(input)
    })
  })

  describe(`@import "./file.css" ${description}`, () => {
    let input = `/* before */ @import "./file.css" ${condition}; /* after */`

    it('removes block with min width greater than option max width', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* before */ /* after */')
    })

    it('removes query with min width lesser than option', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* before */ @import "./file.css"; /* after */')
    })

    it('removes query with min width equal to option', async () => {
      let result = await run(input, { minValue: 480 })
      expect(result).toEqual('/* before */ @import "./file.css"; /* after */')
    })

    it('preserves query with min width greater than option', async () => {
      let result = await run(input, { minValue: 320 })
      expect(result).toEqual(input)
    })
  })
})

const ltWidthVariants = ['(width < N)', '(N > width)']
ltWidthVariants.forEach(description => {
  let condition = description.replace('N', '480px')

  describe(`@media ${description}`, () => {
    let input = `/* outside */ @media ${condition} { /* inside */ }`

    it('preserves query with max width lesser than option', async () => {
      let result = await run(input, { maxValue: 768 })
      expect(result).toEqual(input)
    })

    it('preserves query with max width equal to option', async () => {
      let result = await run(input, { maxValue: 480 })
      expect(result).toEqual(input)
    })

    it('removes query with max width greater than option', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('removes block with max width lesser than option min width', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* outside */')
    })
  })

  describe(`@import "./file.css" ${description}`, () => {
    let input = `/* before */ @import "./file.css" ${condition}; /* after */`

    it('preserves query with max width lesser than option', async () => {
      let result = await run(input, { maxValue: 768 })
      expect(result).toEqual(input)
    })

    it('preserves query with max width equal to option', async () => {
      let result = await run(input, { maxValue: 480 })
      expect(result).toEqual(input)
    })

    it('removes query with max width greater than option', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* before */ @import "./file.css"; /* after */')
    })

    it('removes block with max width lesser than option min width', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* before */ /* after */')
    })
  })
})

const lteWidthVariants = ['(width <= N)', '(N >= width)', '(max-width: N)']
lteWidthVariants.forEach(description => {
  let condition = description.replace('N', '480px')

  describe(`@media ${description}`, () => {
    let input = `/* outside */ @media ${condition} { /* inside */ }`

    it('preserves query with max width lesser than option', async () => {
      let result = await run(input, { maxValue: 768 })
      expect(result).toEqual(input)
    })

    it('removes query with max width equal to option', async () => {
      let result = await run(input, { maxValue: 480 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('removes query with max width greater than option', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* outside */ /* inside */')
    })

    it('removes block with max width lesser than option min width', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* outside */')
    })
  })

  describe(`@import "./file.css" ${description}`, () => {
    let input = `/* before */ @import "./file.css" ${condition}; /* after */`

    it('preserves query with max width lesser than option', async () => {
      let result = await run(input, { maxValue: 768 })
      expect(result).toEqual(input)
    })

    it('removes query with max width equal to option', async () => {
      let result = await run(input, { maxValue: 480 })
      expect(result).toEqual('/* before */ @import "./file.css"; /* after */')
    })

    it('removes query with max width greater than option', async () => {
      let result = await run(input, { maxValue: 320 })
      expect(result).toEqual('/* before */ @import "./file.css"; /* after */')
    })

    it('removes block with max width lesser than option min width', async () => {
      let result = await run(input, { minValue: 768 })
      expect(result).toEqual('/* before */ /* after */')
    })
  })
})

const gteLteWidthVariants = [
  '(width => N1) and (width <= N2)',
  '(min-width: N1) and (max-width: N2)'
  // '(N1 <= width =< N2)'
]
gteLteWidthVariants.forEach(description => {
  let conditions = description.replace('N1', '768px').replace('N2', '1024px')

  describe(`@media ${conditions}`, () => {
    let [condition1, condition2] = conditions.split(' and ')
    let input = `/* outside */ @media ${conditions} { /* inside */ }`

    describe('opts.minWidth && opts.maxWidth', () => {
      it('removes query with min width and max-width equal to option', async () => {
        let result = await run(input, { minValue: 768, maxValue: 1024 })
        expect(result).toEqual('/* outside */ /* inside */')
      })

      it('preserves partial query when lower overlap', async () => {
        let result = await run(input, { minValue: 480, maxValue: 960 })
        expect(result).toEqual(
          `/* outside */ @media ${condition1} { /* inside */ }`
        )
      })

      it('preserves partial query when higher overlap', async () => {
        let result = await run(input, { minValue: 960, maxValue: 1280 })
        expect(result).toEqual(
          `/* outside */ @media ${condition2} { /* inside */ }`
        )
      })

      it('preserves query with min width and max-width within option', async () => {
        let result = await run(input, { minValue: 480, maxValue: 1280 })
        expect(result).toEqual(input)
      })
    })

    describe('opts.minWidth', () => {
      it('preserves query max-width condition when no option', async () => {
        let result = await run(input, { minValue: 768 })
        expect(result).toEqual(
          `/* outside */ @media ${condition2} { /* inside */ }`
        )
      })

      it('removes block with max width lesser than option min width', async () => {
        let result = await run(input, { minValue: 1280 })
        expect(result).toEqual('/* outside */')
      })
    })

    describe('opts.maxWidth', () => {
      it('preserves query min-width condition when no option', async () => {
        let result = await run(input, { maxValue: 1024 })
        expect(result).toEqual(
          `/* outside */ @media ${condition1} { /* inside */ }`
        )
      })

      it('removes block with min width greater than option max width', async () => {
        let result = await run(input, { maxValue: 480 })
        expect(result).toEqual('/* outside */')
      })
    })
  })

  describe(`@import "./file.css" ${description}`, () => {
    let [condition1, condition2] = conditions.split(' and ')
    let input = `/* before */ @import "./file.css" ${conditions}; /* after */`

    describe('opts.minWidth && opts.maxWidth', () => {
      it('removes query with min width and max-width equal to option', async () => {
        let result = await run(input, { minValue: 768, maxValue: 1024 })
        expect(result).toEqual('/* before */ @import "./file.css"; /* after */')
      })

      it('preserves partial query when lower overlap', async () => {
        let result = await run(input, { minValue: 480, maxValue: 960 })
        expect(result).toEqual(
          `/* before */ @import "./file.css" ${condition1}; /* after */`
        )
      })

      it('preserves partial query when higher overlap', async () => {
        let result = await run(input, { minValue: 960, maxValue: 1280 })
        expect(result).toEqual(
          `/* before */ @import "./file.css" ${condition2}; /* after */`
        )
      })

      it('preserves query with min width and max-width within option', async () => {
        let result = await run(input, { minValue: 480, maxValue: 1280 })
        expect(result).toEqual(input)
      })
    })

    describe('opts.minWidth', () => {
      it('preserves query max-width condition when no option', async () => {
        let result = await run(input, { minValue: 768 })
        expect(result).toEqual(
          `/* before */ @import "./file.css" ${condition2}; /* after */`
        )
      })

      it('removes block with max width lesser than option min width', async () => {
        let result = await run(input, { minValue: 1280 })
        expect(result).toEqual('/* before */ /* after */')
      })
    })

    describe('opts.maxWidth', () => {
      it('preserves query min-width condition when no option', async () => {
        let result = await run(input, { maxValue: 1024 })
        expect(result).toEqual(
          `/* before */ @import "./file.css" ${condition1}; /* after */`
        )
      })

      it('removes block with min width greater than option max width', async () => {
        let result = await run(input, { maxValue: 480 })
        expect(result).toEqual('/* before */ /* after */')
      })
    })
  })
})

const inapplicableRangeVariants = [
  '(width > N1) and (width < N2)',
  '(width => N1) and (width <= N2)',
  '(min-width: N1) and (max-width: N2)',
  '(N1 <= width =< N2)',
  '(N1 < width < N2)'
]
inapplicableRangeVariants.forEach(description => {
  let conditions = description.replace('N1', '1024px').replace('N2', '768px')
  describe(`@media ${conditions}`, () => {
    it('removes block with inapplicable range', async () => {
      let input = `/* outside */ @media ${conditions} { /* inside */ }`
      let result = await run(input)

      expect(result).toEqual('/* outside */')
    })
  })
})

it('leaves unrelated queries untouched', async () => {
  let input = `
    @media print { /* print styles */ }
    @media (orientation: landscape) { /* landscape styles */ }
    @media (min-height: 800px) { /* height requiring styles */ }
  `
  let result = await run(input, { minValue: 480, maxValue: 1280 })
  expect(result).toEqual(input)
})
