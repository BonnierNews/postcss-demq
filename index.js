let postcss = require('postcss')

module.exports = postcss.plugin('postcss-demq', opts => {
  opts = opts || {}
  let mqParser = MQParser(opts)

  return root => {
    root.walkAtRules('media', atRule => {
      let params = mqParser(atRule)

      if (!params.match()) {
        atRule.remove()
        return
      }

      let newParams = params.render()
      if (newParams) {
        atRule.params = newParams
        return
      }

      atRule.replaceWith(atRule.nodes)
    })
  }
})

function MQParser (opts) {
  opts = Object.assign({ minValue: 0, maxValue: Infinity }, opts)

  return parse

  function parse (atRule) {
    return Params(atRule.params)
  }

  function Params (paramsString) {
    let queries = paramsString.split(/,\s?/).map(Query)

    return {
      match,
      render
    }

    function match () {
      return queries.some(query => query.match())
    }

    function render () {
      return queries
        .map(query => query.render())
        .filter(Boolean)
        .join(', ')
    }
  }

  function Query (queryString) {
    let conditions = queryString
      .replace(/([<=>]+)\s+width\s+([<=>]+)/, '$1 width) and (width $2')
      .split(/\s+and\s+/)
      .map(Condition)

    return {
      match,
      render
    }

    function match () {
      let matchAll = conditions.length > 1

      return (
        validate() && conditions.some(condition => condition.match(matchAll))
      )
    }

    function validate () {
      if (conditions.length === 1) return true

      let range = conditions.sort(a => {
        if (a.lt) return 1
        if (a.gt) return -1
        return 0
      })

      return range[1].value - range[0].value > 0
    }

    function render () {
      return conditions
        .map(condition => condition.render())
        .filter(Boolean)
        .join(' and ')
    }
  }

  function Condition (conditionString) {
    let condition = parseCondition(conditionString)
    let { lt, gt, eq, value } = condition || {}

    return {
      match,
      render,
      lt,
      gt,
      eq,
      value
    }

    function match (matchAll) {
      if (!condition) return true

      let lteMaxValue = value <= opts.maxValue
      let gteMinValue = value >= opts.minValue

      if (matchAll) {
        return lteMaxValue && gteMinValue
      }
      return gt ? lteMaxValue : gteMinValue
    }

    function render () {
      if (!condition) return conditionString

      let tests = []
      if (gt) tests.push(value > opts.minValue)
      if (lt) tests.push(value < opts.maxValue)
      if (!eq) {
        tests.push(gt ? value === opts.minValue : value === opts.maxValue)
      }
      let preserveQuery = tests.some(test => test)

      return preserveQuery && conditionString
    }
  }
}

function parseCondition (conditionString) {
  conditionString = normalize(conditionString)
  let parts = /(?:(\d+\w+)\s+([<=>]+)\s*?)?width(?:\s*?([<=>]+)\s+(\d+\w+))?/.exec(
    conditionString
  )
  if (!parts) return null

  let [
    ,
    leftValuePart,
    leftComparatorPart,
    rightComparatorPart,
    rightValuePart
  ] = parts
  return {
    lt: leftComparatorPart
      ? leftComparatorPart.includes('>')
      : rightComparatorPart.includes('<'),
    gt: leftComparatorPart
      ? leftComparatorPart.includes('<')
      : rightComparatorPart.includes('>'),
    eq: (leftComparatorPart || rightComparatorPart).includes('='),
    value: parseInt(leftValuePart || rightValuePart)
  }

  function normalize (str) {
    return str
      .replace('min-width:', 'width >=')
      .replace('max-width:', 'width <=')
  }
}
