var postcss = require('postcss')

module.exports = postcss.plugin('postcss-demq', function (opts) {
  opts = opts || {}

  return function (root) {
    root.walkAtRules('media', function (atRule) {
      var params = Params(atRule.params)

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

  function Params (value) {
    var queries = value.split(/,\s?/)
      .map(function (queryString) {
        return Query(queryString)
      })

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
    var query = queryString.split(/\s+and\s/)
      .map(Condition)
      .reduce(mergeConditions, {})

    return {
      match: match,
      render: render
    }

    function mergeConditions (sum, condition) {
      return Object.assign(sum, condition)
    }

    function match () {
      var widths = [query.minWidth, query.maxWidth]

      if (!query.minWidth) return widths.some(gteMinWidth)
      if (!query.maxWidth) return widths.some(lteMaxWidth)
      return widths.some(inRange)

      function inRange (width) {
        return gteMinWidth(width) && lteMaxWidth(width)
      }

      function gteMinWidth (width) {
        return width >= (opts.minWidth || width)
      }

      function lteMaxWidth (width) {
        return width <= (opts.maxWidth || width)
      }
    }

    function render () {
      if (!match()) return null

      var useQueryMinWidth = query.minWidth && (!opts.minWidth || (query.minWidth > opts.minWidth))
      var useQueryMaxWidth = query.maxWidth && (!opts.maxWidth || (query.maxWidth < opts.maxWidth))
      if (!useQueryMinWidth && !useQueryMaxWidth) return null

      var conditions = []
      if (useQueryMinWidth) conditions.push('(min-width: ' + query.minWidth + 'px)')
      if (useQueryMaxWidth) conditions.push('(max-width: ' + query.maxWidth + 'px)')

      return conditions.join(' and ')
    }
  }

  function Condition (conditionString) {
    var parsed = /(min|max)-width\s?:\s?(\d+px)/.exec(conditionString)
    var type = parsed && parsed[1]
    var value = parsed && parsed[2] && parseInt(parsed[2])
    var condition = {}
    condition[type + 'Width'] = value

    return condition
  }
})
