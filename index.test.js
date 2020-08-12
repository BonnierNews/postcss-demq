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
    let gtWidthVariants = ['(width > N)', '(N < width)']
    gtWidthVariants.forEach(variant => {
      describe(variant, () => {
        let utils = Utils(Conditions(variant, '480px'))

        it('removes block with min width greater than option max-width', async () => {
          await utils.assertRemoved({ maxValue: 320 })
        })

        it('removes query with min width lesser than option min width', async () => {
          await utils.assertCollapsed({ minValue: 768 })
        })

        it('removes block with min width equal to option max width', async () => {
          await utils.assertRemoved({ maxValue: 480 })
        })

        it('preserves query with min width equal to option min width', async () => {
          await utils.assertPreserved({ minValue: 480 })
        })

        it('preserves query with min width greater than option min width', async () => {
          await utils.assertPreserved({ minValue: 320 })
        })
      })
    })

    let gteWidthVariants = ['(width >= N)', '(N <= width)', '(min-width: N)']
    gteWidthVariants.forEach(variant => {
      describe(variant, () => {
        let utils = Utils(Conditions(variant, '480px'))

        it('removes block with min width greater than option max width', async () => {
          await utils.assertRemoved({ maxValue: 320 })
        })

        it('removes query with min width lesser than option min width', async () => {
          await utils.assertCollapsed({ minValue: 768 })
        })

        it('removes query with min width equal to option min width', async () => {
          await utils.assertCollapsed({ minValue: 480 })
        })

        it('preserves query with min width greater than option min width', async () => {
          await utils.assertPreserved({ minValue: 320 })
        })
      })
    })

    let ltWidthVariants = ['(width < N)', '(N > width)']
    ltWidthVariants.forEach(variant => {
      describe(variant, () => {
        let utils = Utils(Conditions(variant, '480px'))

        it('preserves query with max width lesser than option', async () => {
          await utils.assertPreserved({ maxValue: 768 })
        })

        it('preserves query with max width equal to option', async () => {
          await utils.assertPreserved({ maxValue: 480 })
        })

        it('removes block with max width equal to option min width', async () => {
          await utils.assertRemoved({ minValue: 480 })
        })

        it('removes query with max width greater than option', async () => {
          await utils.assertCollapsed({ maxValue: 320 })
        })

        it('removes block with max width lesser than option min width', async () => {
          await utils.assertRemoved({ minValue: 768 })
        })
      })
    })

    let lteWidthVariants = ['(width <= N)', '(N >= width)', '(max-width: N)']
    lteWidthVariants.forEach(variant => {
      describe(variant, () => {
        let utils = Utils(Conditions(variant, '480px'))

        it('preserves query with max width lesser than option', async () => {
          await utils.assertPreserved({ maxValue: 768 })
        })

        it('removes query with max width equal to option', async () => {
          await utils.assertCollapsed({ maxValue: 480 })
        })

        it('removes query with max width greater than option', async () => {
          await utils.assertCollapsed({ maxValue: 320 })
        })

        it('removes block with max width lesser than option min width', async () => {
          await utils.assertRemoved({ minValue: 768 })
        })
      })
    })

    let gteLteWidthVariants = [
      '(width => N1) and (width <= N2)',
      '(min-width: N1) and (max-width: N2)'
      // '(N1 <= width =< N2)'
    ]
    gteLteWidthVariants.forEach(variant => {
      describe(variant, () => {
        let conditions = Conditions(variant, '768px', '1024px')
        let [condition1, condition2] = conditions.split(' and ')
        let utils = Utils(conditions)

        describe('opts.minWidth && opts.maxWidth', () => {
          it('removes query with min width and max-width equal to option', async () => {
            await utils.assertCollapsed({ minValue: 768, maxValue: 1024 })
          })

          it('preserves partial query when lower overlap', async () => {
            await utils.assertEdited(condition1, { minValue: 480, maxValue: 960 })
          })

          it('preserves partial query when higher overlap', async () => {
            await utils.assertEdited(condition2, { minValue: 960, maxValue: 1280 })
          })

          it('preserves query with min width and max-width within option', async () => {
            await utils.assertPreserved({ minValue: 480, maxValue: 1280 })
          })
        })

        describe('opts.minWidth', () => {
          it('preserves query max-width condition when no option', async () => {
            await utils.assertEdited(condition2, { minValue: 768 })
          })

          it('removes block with max width lesser than option min width', async () => {
            await utils.assertRemoved({ minValue: 1280 })
          })
        })

        describe('opts.maxWidth', () => {
          it('preserves query min-width condition when no option', async () => {
            await utils.assertEdited(condition1, { maxValue: 1024 })
          })

          it('removes block with min width greater than option max width', async () => {
            await utils.assertRemoved({ maxValue: 480 })
          })
        })
      })
    })

    let inapplicableRangeVariants = [
      '(width > N1) and (width < N2)',
      '(width => N1) and (width <= N2)',
      '(min-width: N1) and (max-width: N2)',
      '(N1 <= width =< N2)',
      '(N1 < width < N2)'
    ]
    inapplicableRangeVariants.forEach(variant => {
      describe(variant, () => {
        let utils = Utils(Conditions(variant, '1024px', '768px'))

        it('removes block with inapplicable range', async () => {
          await utils.assertRemoved()
        })
      })
    })

    let unrelatedQueryVariants = [
      'print',
      '(orientation: landscape)',
      '(min-height: N)'
    ]
    unrelatedQueryVariants.forEach(variant => {
      describe(variant, () => {
        let utils = Utils(Conditions(variant, '768px'))

        it('leaves unrelated queries untouched', async () => {
          await utils.assertPreserved({ minValue: 480, maxValue: 1280 })
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

function Conditions (template, ...ns) {
  if (ns.length === 1) return template.replace('N', ns[0])

  let conditions = template

  for (let [i, n] of ns.entries()) {
    conditions = conditions.replace(`N${i + 1}`, n)
  }

  return conditions
}

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
