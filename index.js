let postcss = require('postcss')

module.exports = postcss.plugin('postcss-demq', opts => {
  opts = opts || {}
  let mqParser = MQParser(opts)

  return root => {
    root.walkAtRules('import', atRule => filterImportRule(atRule, mqParser))
    root.walkAtRules('media', atRule => filterMediaRule(atRule, mqParser))
  }
})

module.exports.MQParser = MQParser

function filterImportRule (importRule, mqParser) {
  // eslint-disable-next-line security/detect-unsafe-regex
  let parts = /((?:url\()?(?:".*?"|'.*?')\)?\s*)(\w+\(.+?\)\s+)?(.*)/.exec(
    importRule.params
  )
  let [, filePath, supportsQuery, paramsString] = parts || []
  if (!paramsString || !paramsString.trim()) return

  let params = mqParser(paramsString)

  if (!params.match()) {
    importRule.remove()
    return
  }

  importRule.params = [filePath, supportsQuery, params.render()]
    .filter(Boolean)
    .map(partString => partString.trim())
    .join(' ')
}

function filterMediaRule (mediaRule, mqParser) {
  let params = mqParser(mediaRule.params)

  if (!params.match()) {
    mediaRule.remove()
    return
  }

  let newParams = params.render()
  if (newParams) {
    mediaRule.params = newParams
    return
  }

  mediaRule.replaceWith(mediaRule.nodes)
}

function MQParser (opts) {
  opts = Object.assign({ minValue: -Infinity, maxValue: Infinity }, opts)

  return parse

  function parse (params) {
    return QueryList(params)
  }

  function QueryList (queryListString) {
    let queries = queryListString.split(/,\s?/).map(Query)

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
    let allConditions = queryString
      .replace(/([<=>]+)\s+width\s+([<=>]+)/, '$1 width) and (width $2')
      .split(/\s+and\s+/)
      .map(Condition)

    let gtCondition = allConditions
      .filter(c => c.gt)
      .sort((c1, c2) => c1.value - c2.value)
      .pop()
    let ltCondition = allConditions
      .filter(c => c.lt)
      .sort((c1, c2) => c1.value - c2.value)
      .shift()
    let conditions = [gtCondition, ltCondition].filter(Boolean)

    return {
      match,
      render
    }

    function match () {
      if (!conditions.length) return true

      let matchAll = conditions.length > 1
      return (
        validate() && conditions.some(condition => condition.match(matchAll))
      )
    }

    function validate () {
      if (conditions.length < 2) return conditions.length
      return gtCondition.value < ltCondition.value
    }

    function render () {
      return allConditions
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

      let [gteMinValue, lteMaxValue] = [
        [value > opts.minValue, eq && value === opts.minValue],
        [value < opts.maxValue, eq && value === opts.maxValue]
      ].map(tests => tests.some(test => test))

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
  // eslint-disable-next-line security/detect-unsafe-regex
  let parts = /(?:(\d+px)\s+([<=>]+)\s*?)?width(?:\s*?([<=>]+)\s+(\d+px))?/.exec(
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
  if (!leftValuePart && !rightValuePart) return null
  if (!leftComparatorPart && !rightComparatorPart) return null

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
