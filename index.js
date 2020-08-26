'use strict';

const postcss = require('postcss');

module.exports = postcss.plugin('postcss-demq', opts => {
  opts = opts || {};
  const mqParser = MQParser(opts);

  return root => {
    root.walkAtRules('import', atRule => filterImportRule(atRule, mqParser));
    root.walkAtRules('media', atRule => filterMediaRule(atRule, mqParser));
  };
});

function filterImportRule (importRule, mqParser) {
  const parts = /((?:url\()?(?:".*?"|'.*?')\)?\s*)(\w+\(.+?\)\s+)?(.*)/.exec(
    importRule.params,
  );
  const [, filePath, supportsQuery, paramsString] = parts || [];
  if (!paramsString || !paramsString.trim()) return;

  const params = mqParser(paramsString);

  if (!params.match()) {
    importRule.remove();
    return;
  }

  importRule.params = [filePath, supportsQuery, params.render()]
    .filter(Boolean)
    .map(partString => partString.trim())
    .join(' ');
}

function filterMediaRule (mediaRule, mqParser) {
  const params = mqParser(mediaRule.params);

  if (!params.match()) {
    mediaRule.remove();
    return;
  }

  const newParams = params.render();
  if (newParams) {
    mediaRule.params = newParams;
    return;
  }

  mediaRule.replaceWith(mediaRule.nodes);
}

function MQParser (opts) {
  opts = Object.assign({
    minValue: -Infinity,
    maxValue: Infinity ,
    filter: undefined,
  }, opts);

  const filterRange = {
    start: opts.minValue,
    end: opts.maxValue,
  };

  return parse;

  function parse (params) {
    return QueryList(params);
  }

  function QueryList (queryListString) {
    const queries = queryListString.split(/,\s?/)
      .map(Query);

    return {
      match,
      render,
    };

    function match () {
      return queries.some(query => query.match());
    }

    function render () {
      return queries
        .map(query => query.render())
        .filter(Boolean)
        .join(', ');
    }
  }

  function Query (queryString) {
    const allConditions = queryString
      .replace(/([<=>]+)\s+width\s+([<=>]+)/, '$1 width) and (width $2')
      .split(/\s+and\s+/)
      .map(Condition);

    const gtCondition = allConditions
      .filter(c => c.gt)
      .sort((c1, c2) => c1.value - c2.value)
      .pop();
    const ltCondition = allConditions
      .filter(c => c.lt)
      .sort((c1, c2) => c1.value - c2.value)
      .shift();

    const queryRange = {
      start: gtCondition ? gtCondition.value : -Infinity,
      end: ltCondition ? ltCondition.value : Infinity,
    };

    const conditions = [gtCondition, ltCondition].filter(Boolean);
    const query = {
      source: queryString,
      conditions: allConditions,
      match,
      render,
    };
    const filter = applyFilter(opts.filter, query);

    return query;

    function match () {
      if (filter) return filter.match;
      if (!conditions.length) return true;

      return validate() &&
        isIntersecting(queryRange, filterRange, gtCondition && gtCondition.eq, ltCondition && ltCondition.eq);
    }

    function validate () {
      if (conditions.length < 2) return conditions.length;
      return gtCondition.value < ltCondition.value;
    }

    function render() {
      return allConditions
        .map((condition, index) => condition.render(filter && filter.conditions[index]))
        .filter(Boolean)
        .join(' and ');
    }
  }

  function Condition (conditionString) {
    const condition = parseCondition(conditionString);
    const { lt, gt, eq, value } = condition || {};

    return {
      source: conditionString,
      render,
      lt,
      gt,
      eq,
      value,
    };

    function render (override) {
      if (typeof override !== 'undefined') {
        return override && conditionString;
      }

      if (!condition) return conditionString;

      const tests = [];
      if (gt) tests.push(value > opts.minValue);
      if (lt) tests.push(value < opts.maxValue);
      if (!eq) {
        tests.push(gt ? value === opts.minValue : value === opts.maxValue);
      }
      const preserveQuery = tests.some(test => test);
      return preserveQuery && conditionString;
    }
  }
}

function parseCondition (conditionString) {
  conditionString = normalize(conditionString);
  const parts = /(?:(\d+px)\s+([<>]?=?)\s*?)?width(?:\s*?([<>]?=?)\s+(\d+px))?/.exec(
    conditionString,
  );

  const [
    ,
    leftValuePart,
    leftComparatorPart,
    rightComparatorPart,
    rightValuePart,
  ] = parts || [];
  if (!leftValuePart && !rightValuePart) return null;
  if (!leftComparatorPart && !rightComparatorPart) return null;

  return {
    lt: leftComparatorPart
      ? leftComparatorPart.includes('>')
      : rightComparatorPart.includes('<'),
    gt: leftComparatorPart
      ? leftComparatorPart.includes('<')
      : rightComparatorPart.includes('>'),
    eq: (leftComparatorPart || rightComparatorPart).includes('='),
    value: parseInt(leftValuePart || rightValuePart),
  };

  function normalize (str) {
    return str
      .replace('min-width:', 'width >=')
      .replace('max-width:', 'width <=');
  }
}

function applyFilter (filter, query) {
  if (!filter || typeof filter !== 'function') return;

  const override = filter(query);
  const match = Boolean(override);
  let conditions;
  if (Array.isArray(override)) {
    conditions = query.conditions.map((c, i) => override[i]);
  }
  else {
    conditions = Array(query.conditions.length)
      .fill(override);
  }

  if (conditions.every(c => typeof c === 'undefined')) return;

  return {
    match,
    conditions,
  };
}

function isIntersecting (r1, r2, includeStart = true, includeEnd = true) {
  return (r2.end > r1.start || (includeStart && r2.end === r1.start)) &&
    (r2.start < r1.end || (includeEnd && r2.start === r1.end));
}
