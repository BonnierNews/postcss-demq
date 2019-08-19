var postcss = require('postcss')
var mqParser = require('postcss-media-query-parser').default

module.exports = postcss.plugin('postcss-demq', function (opts) {
  opts.minWidth = opts.minWidth || 0
  opts.maxWidth = opts.maxWidth || Infinity

  return function (root) {
    root.walkAtRules('media', function (atRule) {
      var mqList = mqParser(atRule.params)
      mqList.nodes.forEach(function (mq) {
        mq.nodes.forEach(function (condition) {
          console.log(condition.nodes[0], condition.nodes[2])
        })
      })
    })
  }

  function isInRange ($minWidth, $maxWidth) {
    var widths = [$minWidth, $maxWidth].map(convert)
    var minWidth = widths[0]
    var maxWidth = widths[1]

    if (!minWidth) return widths.some(gteMinWidth)
    if (!maxWidth) return widths.some(lteMaxWidth)
    return widths.some(inRange)

    function inRange (width) {
      return gteMinWidth(width) && lteMaxWidth(width)
    }

    function gteMinWidth (width) {
      return width >= opts.minWidth
    }

    function lteMaxWidth (width) {
      return width <= opts.maxWidth
    }
  }
})
