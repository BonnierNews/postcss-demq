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
  opts = Object.assign({ minWidth: 0, maxWidth: Infinity }, opts)

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
      return conditions.some(condition => condition.match(matchAll))
    }

    function render () {
      return conditions
        .map(condition => condition.render())
        .filter(Boolean)
        .join(' and ')
    }
  }

  function Condition (conditionString) {
    let { lt, gt, eq, width } = conditionString.includes(':')
      ? parseRegular()
      : parseRange()

    let eqMinWidth = width === opts.minWidth
    let gtMinWidth = width > opts.minWidth
    let eqMaxWidth = width === opts.maxWidth
    let ltMaxWidth = width < opts.maxWidth

    return {
      match,
      render
    }

    function match (matchAll) {
      let lteMaxWidth = width <= opts.maxWidth
      let gteMinWidth = width >= opts.minWidth
      if (matchAll) {
        return lteMaxWidth && gteMinWidth
      }
      return gt ? lteMaxWidth : gteMinWidth
    }

    function render () {
      let conditions = []
      if (gt) conditions.push(gtMinWidth)
      if (lt) conditions.push(ltMaxWidth)
      if (!eq) conditions.push(gt ? eqMinWidth : eqMaxWidth)
      let preserveQuery = conditions.some(condition => condition)

      return preserveQuery && conditionString
    }

    function parseRegular () {
      let parts = /(?:(min|max)-)?width\s?:\s?(\d+\w)/.exec(conditionString)
      if (!parts) return null

      let [, comparatorPart, widthPart] = parts
      return {
        lt: comparatorPart === 'max',
        gt: comparatorPart === 'min',
        eq: true,
        width: parseInt(widthPart)
      }
    }

    function parseRange () {
      let parts = /(?:(\d+\w+)\s+([<=>]+)\s*?)?width(?:\s*?([<=>]+)\s+(\d+\w+))?/.exec(
        conditionString
      )
      if (!parts) return null

      let [
        ,
        leftWidthPart,
        leftComparatorPart,
        rightComparatorPart,
        rightWidthPart
      ] = parts
      return {
        lt: leftComparatorPart
          ? leftComparatorPart.includes('>')
          : rightComparatorPart.includes('<'),
        gt: leftComparatorPart
          ? leftComparatorPart.includes('<')
          : rightComparatorPart.includes('>'),
        eq: (leftComparatorPart || rightComparatorPart).includes('='),
        width: parseInt(leftWidthPart || rightWidthPart)
      }
    }
  }
}
