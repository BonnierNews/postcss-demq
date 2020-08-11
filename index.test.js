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

let suites = [
  ['@media', MediaUtils],
  ['@import', ImportUtils]
]
suites.forEach(([atRuleType, Utils]) => {
  describe(`${atRuleType} at-rule`, () => {
    let gtWidthVariants = ['(width > N)', '(N < width)']
    gtWidthVariants.forEach(description => {
      describe(description, () => {
        let utils = Utils(Conditions(description, '480px'))

        it('removes block with min width greater than option max-width', async () => {
          let result = await run(utils.input, { maxValue: 320 })
          utils.assertRemoved(result)
        })

        it('removes query with min width lesser than option min width', async () => {
          let result = await run(utils.input, { minValue: 768 })
          utils.assertCollapsed(result)
        })

        it('removes block with min width equal to option max width', async () => {
          let result = await run(utils.input, { maxValue: 480 })
          utils.assertRemoved(result)
        })

        it('preserves query with min width equal to option min width', async () => {
          let result = await run(utils.input, { minValue: 480 })
          utils.assertPreserved(result)
        })

        it('preserves query with min width greater than option min width', async () => {
          let result = await run(utils.input, { minValue: 320 })
          utils.assertPreserved(result)
        })
      })
    })

    let gteWidthVariants = ['(width >= N)', '(N <= width)', '(min-width: N)']
    gteWidthVariants.forEach(description => {
      describe(description, () => {
        let utils = Utils(Conditions(description, '480px'))

        it('removes block with min width greater than option max width', async () => {
          let result = await run(utils.input, { maxValue: 320 })
          utils.assertRemoved(result)
        })

        it('removes query with min width lesser than option min width', async () => {
          let result = await run(utils.input, { minValue: 768 })
          utils.assertCollapsed(result)
        })

        it('removes query with min width equal to option min width', async () => {
          let result = await run(utils.input, { minValue: 480 })
          utils.assertCollapsed(result)
        })

        it('preserves query with min width greater than option min width', async () => {
          let result = await run(utils.input, { minValue: 320 })
          utils.assertPreserved(result)
        })
      })
    })

    let ltWidthVariants = ['(width < N)', '(N > width)']
    ltWidthVariants.forEach(description => {
      describe(description, () => {
        let utils = Utils(Conditions(description, '480px'))

        it('preserves query with max width lesser than option', async () => {
          let result = await run(utils.input, { maxValue: 768 })
          utils.assertPreserved(result)
        })

        it('preserves query with max width equal to option', async () => {
          let result = await run(utils.input, { maxValue: 480 })
          utils.assertPreserved(result)
        })

        it('removes block with max width equal to option min width', async () => {
          let result = await run(utils.input, { minValue: 480 })
          utils.assertRemoved(result)
        })

        it('removes query with max width greater than option', async () => {
          let result = await run(utils.input, { maxValue: 320 })
          utils.assertCollapsed(result)
        })

        it('removes block with max width lesser than option min width', async () => {
          let result = await run(utils.input, { minValue: 768 })
          utils.assertRemoved(result)
        })
      })
    })

    let lteWidthVariants = ['(width <= N)', '(N >= width)', '(max-width: N)']
    lteWidthVariants.forEach(description => {
      describe(description, () => {
        let utils = Utils(Conditions(description, '480px'))

        it('preserves query with max width lesser than option', async () => {
          let result = await run(utils.input, { maxValue: 768 })
          utils.assertPreserved(result)
        })

        it('removes query with max width equal to option', async () => {
          let result = await run(utils.input, { maxValue: 480 })
          utils.assertCollapsed(result)
        })

        it('removes query with max width greater than option', async () => {
          let result = await run(utils.input, { maxValue: 320 })
          utils.assertCollapsed(result)
        })

        it('removes block with max width lesser than option min width', async () => {
          let result = await run(utils.input, { minValue: 768 })
          utils.assertRemoved(result)
        })
      })
    })

    let gteLteWidthVariants = [
      '(width => N1) and (width <= N2)',
      '(min-width: N1) and (max-width: N2)'
      // '(N1 <= width =< N2)'
    ]
    gteLteWidthVariants.forEach(description => {
      describe(description, () => {
        let conditions = Conditions(description, '768px', '1024px')
        let [condition1, condition2] = conditions.split(' and ')
        let utils = Utils(conditions)

        describe('opts.minWidth && opts.maxWidth', () => {
          it('removes query with min width and max-width equal to option', async () => {
            let result = await run(utils.input, {
              minValue: 768,
              maxValue: 1024
            })
            utils.assertCollapsed(result)
          })

          it('preserves partial query when lower overlap', async () => {
            let result = await run(utils.input, {
              minValue: 480,
              maxValue: 960
            })
            utils.assertEdited(result, condition1)
          })

          it('preserves partial query when higher overlap', async () => {
            let result = await run(utils.input, {
              minValue: 960,
              maxValue: 1280
            })
            utils.assertEdited(result, condition2)
          })

          it('preserves query with min width and max-width within option', async () => {
            let result = await run(utils.input, {
              minValue: 480,
              maxValue: 1280
            })
            utils.assertPreserved(result)
          })
        })

        describe('opts.minWidth', () => {
          it('preserves query max-width condition when no option', async () => {
            let result = await run(utils.input, { minValue: 768 })
            utils.assertEdited(result, condition2)
          })

          it('removes block with max width lesser than option min width', async () => {
            let result = await run(utils.input, { minValue: 1280 })
            utils.assertRemoved(result)
          })
        })

        describe('opts.maxWidth', () => {
          it('preserves query min-width condition when no option', async () => {
            let result = await run(utils.input, { maxValue: 1024 })
            utils.assertEdited(result, condition1)
          })

          it('removes block with min width greater than option max width', async () => {
            let result = await run(utils.input, { maxValue: 480 })
            utils.assertRemoved(result)
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
    inapplicableRangeVariants.forEach(description => {
      describe(description, () => {
        let utils = Utils(Conditions(description, '1024px', '768px'))

        it('removes block with inapplicable range', async () => {
          let result = await run(utils.input)
          utils.assertRemoved(result)
        })
      })
    })

    let unrelatedQueryVariants = [
      'print',
      '(orientation: landscape)',
      '(min-height: N)'
    ]
    unrelatedQueryVariants.forEach(description => {
      describe(description, () => {
        let utils = Utils(Conditions(description, '768px'))

        it('leaves unrelated queries untouched', async () => {
          let result = await run(utils.input, { minValue: 480, maxValue: 1280 })
          utils.assertPreserved(result)
        })
      })
    })
  })
})

function MediaUtils (conditions) {
  let template = `/* outside */ @media CONDS { /* inside */ }`
  let input = template.replace('CONDS', conditions)

  return {
    input,
    assertRemoved: result => expect(result).toEqual('/* outside */'),
    assertCollapsed: result =>
      expect(result).toEqual('/* outside */ /* inside */'),
    assertEdited: (result, newConditions) =>
      expect(result).toEqual(template.replace('CONDS', newConditions)),
    assertPreserved: result => expect(result).toEqual(input)
  }
}

function ImportUtils (conditions) {
  let template = `/* before */ @import "./file.css" CONDS; /* after */`
  let input = template.replace('CONDS', conditions)

  return {
    input,
    assertRemoved: result => expect(result).toEqual('/* before */ /* after */'),
    assertCollapsed: result =>
      expect(result).toEqual('/* before */ @import "./file.css"; /* after */'),
    assertEdited: (result, newConditions) =>
      expect(result).toEqual(template.replace('CONDS', newConditions)),
    assertPreserved: result => expect(result).toEqual(input)
  }
}

function Conditions (template, ...ns) {
  if (ns.length === 1) return template.replace('N', ns[0])

  let conditions = template

  for (let [i, n] of ns.entries()) {
    conditions = conditions.replace(`N${i + 1}`, n)
  }

  return conditions
}
