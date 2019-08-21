var postcss = require('postcss')

module.exports = postcss.plugin('postcss-demq', function (opts) {
  opts = opts || {}
  var mqParser = MQParser(opts)

  return function (root) {
    root.walkAtRules('media', function (atRule) {
      var params = mqParser(atRule)

      if (!params.match()) {
        atRule.remove()
        return
      }

      var newParams = params.render()
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
    var queries = paramsString.split(/,\s?/)
      .map(Query)

    return {
      match: match,
      render: render
    }

    function match () {
      return queries
        .some(function (query) {
          return query.match()
        })
    }

    function render () {
      return queries
        .map(function (query) {
          return query.render()
        })
        .filter(Boolean)
        .join(', ')
    }
  }

  function Query (queryString) {
    var conditions = queryString.split(/\s+and\s/)
      .map(Condition)

    return {
      match: match,
      render: render
    }

    function match () {
      return conditions
        .some(function (condition) {
          return condition.match()
        })
    }

    function render () {
      return conditions
        .map(function (condition) {
          return condition.render()
        })
        .filter(Boolean)
        .join(' and ')
    }
  }

  function Condition (conditionString) {
    var parsed = /(min|max)-width\s?:\s?(\d+px)/.exec(conditionString)
    var type = parsed && parsed[1]
    var value = parsed && parsed[2] && parseInt(parsed[2])

    return {
      match: match,
      render: render
    }

    function match () {
      var gteMinWidth = value >= (opts.minWidth || 0)
      var lteMaxWidth = value <= (opts.maxWidth || Infinity)

      return (type === 'min') ? lteMaxWidth : gteMinWidth
    }

    function render () {
      var gtMinWidth = value > (opts.minWidth || 0)
      var ltMaxWidth = value < (opts.maxWidth || Infinity)
      var useQuery = (type === 'min') ? gtMinWidth : ltMaxWidth

      return useQuery ? conditionString : null
    }
  }
}
