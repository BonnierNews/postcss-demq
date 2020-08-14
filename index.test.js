const postcss = require('postcss')

const plugin = require('./')

it('leaves unscoped css untouched', async () => {
  let input = 'body { margin: 0 }'
  let result = await run(input)
  expect(result).toEqual(input)
})

let suites = [
  ['@media', MediaUtils],
  ['@import', ImportUtils]
]
suites.forEach(([atRuleType, Utils]) => {
  describe(`${atRuleType} at-rule`, () => {
    let gtWidthVariants = ['(width > 200px)', '(200px < width)']
    gtWidthVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)

        it('removes block with min width greater than option max value', async () => {
          await utils.assertRemoved({ maxValue: 100 })
        })

        it('removes query with min width lesser than option min value', async () => {
          await utils.assertCollapsed({ minValue: 300 })
        })

        it('removes block with min width equal to option max value', async () => {
          await utils.assertRemoved({ maxValue: 200 })
        })

        it('preserves query with min width equal to option min value', async () => {
          await utils.assertPreserved({ minValue: 200 })
        })

        it('preserves query with min width greater than option min value', async () => {
          await utils.assertPreserved({ minValue: 100 })
        })
      })
    })

    let gteWidthVariants = [
      '(width >= 200px)',
      '(200px <= width)',
      '(min-width: 200px)'
    ]
    gteWidthVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)

        it('removes block with min width greater than option max value', async () => {
          await utils.assertRemoved({ maxValue: 100 })
        })

        it('removes query with min width lesser than option min value', async () => {
          await utils.assertCollapsed({ minValue: 300 })
        })

        it('removes query with min width equal to option min value', async () => {
          await utils.assertCollapsed({ minValue: 200 })
        })

        it('preserves query with min width greater than option min value', async () => {
          await utils.assertPreserved({ minValue: 100 })
        })
      })
    })

    let ltWidthVariants = ['(width < 400px)', '(400px > width)']
    ltWidthVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)

        it('preserves query with max width lesser than option max value', async () => {
          await utils.assertPreserved({ maxValue: 500 })
        })

        it('preserves query with max width equal to option max value', async () => {
          await utils.assertPreserved({ maxValue: 400 })
        })

        it('removes block with max width equal to option min value', async () => {
          await utils.assertRemoved({ minValue: 400 })
        })

        it('removes query with max width greater than option max value', async () => {
          await utils.assertCollapsed({ maxValue: 300 })
        })

        it('removes block with max width lesser than option min value', async () => {
          await utils.assertRemoved({ minValue: 500 })
        })
      })
    })

    let lteWidthVariants = [
      '(width <= 400px)',
      '(400px >= width)',
      '(max-width: 400px)'
    ]
    lteWidthVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)

        it('preserves query with max width lesser than option max value', async () => {
          await utils.assertPreserved({ maxValue: 500 })
        })

        it('removes query with max width equal to option max value', async () => {
          await utils.assertCollapsed({ maxValue: 400 })
        })

        it('removes query with max width greater than option max value', async () => {
          await utils.assertCollapsed({ maxValue: 300 })
        })

        it('removes block with max width lesser than option min value', async () => {
          await utils.assertRemoved({ minValue: 500 })
        })
      })
    })

    let gteLteWidthVariants = [
      '(width >= 200px) and (width <= 400px)',
      '(min-width: 200px) and (max-width: 400px)'
      // '(200px <= width <= 400px)'
    ]
    gteLteWidthVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)
        let [condition1, condition2] = conditions.split(' and ')

        it('removes query with min width and max width equal to option max value', async () => {
          await utils.assertCollapsed({ minValue: 200, maxValue: 400 })
        })

        it('preserves partial query when lower overlap', async () => {
          await utils.assertEdited(condition1, {
            minValue: 100,
            maxValue: 300
          })
        })

        it('preserves partial query when higher overlap', async () => {
          await utils.assertEdited(condition2, {
            minValue: 300,
            maxValue: 500
          })
        })

        it('preserves query with min width and max width within option and value', async () => {
          await utils.assertPreserved({ minValue: 100, maxValue: 500 })
        })

        it('preserves query max width condition when no option width value', async () => {
          await utils.assertEdited(condition2, { minValue: 200 })
        })

        it('removes block with max width lesser than option min value', async () => {
          await utils.assertRemoved({ minValue: 500 })
        })

        it('preserves query min width condition when no option width value', async () => {
          await utils.assertEdited(condition1, { maxValue: 400 })
        })

        it('removes block with min width greater than option max value', async () => {
          await utils.assertRemoved({ maxValue: 100 })
        })
      })
    })

    let inapplicableRangeVariants = [
      '(width > 400px) and (width < 200px)',
      '(width >= 400px) and (width <= 200px)',
      '(min-width: 400px) and (max-width: 200px)',
      '(400px <= width <= 200px)',
      '(400px < width < 200px)'
    ]
    inapplicableRangeVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)

        it('removes block with inapplicable range', async () => {
          await utils.assertRemoved()
        })
      })
    })

    let unrelatedQueryVariants = [
      'print',
      '(orientation: landscape)',
      '(min-height: 100px)'
    ]
    unrelatedQueryVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)

        it('leaves unrelated query untouched', async () => {
          await utils.assertPreserved({ minValue: 200, maxValue: 400 })
        })
      })
    })

    let nonPixelWidthVariants = [
      '(width >= 20em) and (width <= 40em)',
      '(width >= 20rem) and (width <= 40rem)'
    ]
    nonPixelWidthVariants.forEach(conditions => {
      describe(conditions, () => {
        let utils = Utils(conditions)

        it('leaves non pixel based query untouched', async () => {
          await utils.assertPreserved({ minValue: 25, maxValue: 35 })
        })
      })
    })

    describe('correctly interprets range despite multiple gt / lt points', () => {
      let multipleGtWidthConditions = [
        '(width > 100px) and (width > 200px)',
        '(width > 200px) and (width > 100px)',
        '(width > 200px) and (width > 100px) and (width > 0px)'
      ]
      multipleGtWidthConditions.forEach(conditions => {
        let utils = Utils(conditions)

        it(conditions, async () => {
          await utils.assertEdited('(width > 200px)', { minValue: 150 })
        })
      })

      let multipleLtConditions = [
        '(width < 400px) and (width < 500px)',
        '(width < 500px) and (width < 400px)',
        '(width < 500px) and (width < 400px) and (width < 600px)'
      ]
      multipleLtConditions.forEach(conditions => {
        let utils = Utils(conditions)

        it(conditions, async () => {
          await utils.assertEdited('(width < 400px)', { maxValue: 450 })
        })
      })
    })
  })
})

function MediaUtils (conditions) {
  let template = `/* outside */ @media CONDS { /* inside */ }`
  let input = template.replace('CONDS', conditions)

  return {
    assertRemoved: opts => assert(input, opts, '/* outside */'),
    assertCollapsed: opts => assert(input, opts, '/* outside */ /* inside */'),
    assertPreserved: opts => assert(input, opts, input),
    assertEdited: (newConditions, opts) =>
      assert(input, opts, template.replace('CONDS', newConditions))
  }
}

function ImportUtils (conditions) {
  let template = `/* before */ @import "./file.css" CONDS; /* after */`
  let input = template.replace('CONDS', conditions)

  return {
    assertRemoved: opts => assert(input, opts, '/* before */ /* after */'),
    assertCollapsed: opts =>
      assert(input, opts, '/* before */ @import "./file.css"; /* after */'),
    assertPreserved: opts => assert(input, opts, input),
    assertEdited: (newConditions, opts) =>
      assert(input, opts, template.replace('CONDS', newConditions))
  }
}

async function assert (input, opts, expected) {
  let actual = await run(input, opts)
  expect(actual).toEqual(expected)
}

async function run (input, opts) {
  let result = await postcss([plugin(opts)]).process(input, {
    from: undefined
  })
  expect(result.warnings()).toHaveLength(0)
  return result.css
}
