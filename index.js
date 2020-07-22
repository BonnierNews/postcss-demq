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
    let conditions = queryString.split(/\s+and\s/).map(Condition)

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
    let parsed = /(min|max)-width\s?:\s?(\d+px)/.exec(conditionString)
    let type = parsed && parsed[1]
    let value = parsed && parsed[2] && parseInt(parsed[2])

    return {
      match,
      render
    }

    function match () {
      let gteMinWidth = value >= (opts.minWidth || 0)
      let lteMaxWidth = value <= (opts.maxWidth || Infinity)

      return type === 'min' ? lteMaxWidth : gteMinWidth
    }

    function render () {
      let gtMinWidth = value > (opts.minWidth || 0)
      let ltMaxWidth = value < (opts.maxWidth || Infinity)
      let useQuery = type === 'min' ? gtMinWidth : ltMaxWidth

      return useQuery ? conditionString : null
    }
  }
}
