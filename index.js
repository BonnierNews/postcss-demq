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
      return conditions.some(condition => condition.match())
    }

    function render () {
      return conditions
        .map(condition => condition.render())
        .filter(Boolean)
        .join(' and ')
    }
  }

  function Condition (conditionString) {
    let minWidth = opts.minWidth || 0
    let maxWidth = opts.maxWidth || Infinity
    let { lt, gt, eq, value } = conditionString.includes(':')
      ? parseRegular()
      : parseRange()

    let eqMinWidth = value === minWidth
    let gtMinWidth = value > minWidth
    let eqMaxWidth = value === maxWidth
    let ltMaxWidth = value < maxWidth

    return {
      match,
      render
    }

    function match () {
      return gt ? eqMaxWidth || ltMaxWidth : eqMinWidth || gtMinWidth
    }

    function render () {
      let conditions = []
      if (gt) conditions.push(gtMinWidth)
      if (lt) conditions.push(ltMaxWidth)
      if (!eq) conditions.push(gt ? eqMinWidth : eqMaxWidth)
      let preserveQuery = conditions.some(condition => condition)

      return preserveQuery ? conditionString : null
    }

    function parseRegular () {
      let parts = /(?:(min|max)-)?width\s?:\s?(\d+\w)/.exec(conditionString)
      if (!parts) return null

      let [, comparatorPart, valuePart] = parts
      return {
        lt: comparatorPart === 'max',
        gt: comparatorPart === 'min',
        eq: true,
        value: parseInt(valuePart)
      }
    }

    function parseRange () {
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
    }
  }
}
