'use strict';

const postcss = require('postcss');

const plugin = require('./');

it('leaves unscoped css untouched', async () => {
  const input = 'body { margin: 0 }';
  const result = await run(input);
  expect(result).toEqual(input);
});

[
  ['@media', MediaUtils],
  ['@import', ImportUtils],
].forEach(([atRuleType, Utils]) => {
  describe(`${atRuleType} at-rule`, () => {
    [
      '(width > 200px)',
      '(200px < width)',
    ].forEach(gtWidthVariant => {
      describe(gtWidthVariant, () => {
        const utils = Utils(gtWidthVariant);

        it('removes block with min width greater than option max value', async () => {
          await utils.assertRemoved({ maxValue: 100 });
        });

        it('collapses block with min width lesser than option min value', async () => {
          await utils.assertCollapsed({ minValue: 300 });
        });

        it('removes block with min width equal to option max value', async () => {
          await utils.assertRemoved({ maxValue: 200 });
        });

        it('preserves query with min width equal to option min value', async () => {
          await utils.assertPreserved({ minValue: 200 });
        });

        it('preserves query with min width greater than option min value', async () => {
          await utils.assertPreserved({ minValue: 100 });
        });
      });
    });

    [
      '(width >= 200px)',
      '(200px <= width)',
      '(min-width: 200px)',
    ].forEach(gteWidthVariant => {
      describe(gteWidthVariant, () => {
        const utils = Utils(gteWidthVariant);

        it('removes block with min width greater than option max value', async () => {
          await utils.assertRemoved({ maxValue: 100 });
        });

        it('collapses block with min width lesser than option min value', async () => {
          await utils.assertCollapsed({ minValue: 300 });
        });

        it('preserves query with min width equal to option max value', async () => {
          await utils.assertPreserved({ maxValue: 200 });
        });

        it('collapses block with min width equal to option min value', async () => {
          await utils.assertCollapsed({ minValue: 200 });
        });

        it('preserves query with min width greater than option min value', async () => {
          await utils.assertPreserved({ minValue: 100 });
        });
      });
    });

    [
      '(width < 400px)',
      '(400px > width)',
    ].forEach(ltWidthVariant => {
      describe(ltWidthVariant, () => {
        const utils = Utils(ltWidthVariant);

        it('preserves query with max width lesser than option max value', async () => {
          await utils.assertPreserved({ maxValue: 500 });
        });

        it('preserves query with max width equal to option max value', async () => {
          await utils.assertPreserved({ maxValue: 400 });
        });

        it('removes block with max width equal to option min value', async () => {
          await utils.assertRemoved({ minValue: 400 });
        });

        it('collapses block with max width greater than option max value', async () => {
          await utils.assertCollapsed({ maxValue: 300 });
        });

        it('removes block with max width lesser than option min value', async () => {
          await utils.assertRemoved({ minValue: 500 });
        });
      });
    });

    [
      '(width <= 400px)',
      '(400px >= width)',
      '(max-width: 400px)',
    ].forEach(lteWidthVariant => {
      describe(lteWidthVariant, () => {
        const utils = Utils(lteWidthVariant);

        it('preserves query with max width lesser than option max value', async () => {
          await utils.assertPreserved({ maxValue: 500 });
        });

        it('collapses block with max width equal to option max value', async () => {
          await utils.assertCollapsed({ maxValue: 400 });
        });

        it('preserves query with max width equal to option min value', async () => {
          await utils.assertPreserved({ minValue: 400 });
        });

        it('collapses block with max width greater than option max value', async () => {
          await utils.assertCollapsed({ maxValue: 300 });
        });

        it('removes block with max width lesser than option min value', async () => {
          await utils.assertRemoved({ minValue: 500 });
        });
      });
    });

    [
      ['(width >= 200px) and (width <= 400px)'],
      ['(min-width: 200px) and (max-width: 400px)'],
      ['(200px <= width <= 400px)', '(width >= 200px) and (width <= 400px)'],
    ].forEach(([gteLteWidthVariant, alternateSyntax]) => {
      describe(gteLteWidthVariant, () => {
        const utils = Utils(alternateSyntax || gteLteWidthVariant);
        const [condition1, condition2] = (alternateSyntax || gteLteWidthVariant).split(' and ');

        it('collapses block with min width and max width equal to option max value', async () => {
          await utils.assertCollapsed({ minValue: 200, maxValue: 400 });
        });

        it('collapses block with min width and max width covering option min value and max value', async () => {
          await utils.assertCollapsed({ minValue: 250, maxValue: 350 });
        });

        it('preserves partial query when lower overlap', async () => {
          await utils.assertEdited(condition1, { minValue: 100, maxValue: 300 });
        });

        it('preserves partial query when higher overlap', async () => {
          await utils.assertEdited(condition2, { minValue: 300, maxValue: 500 });
        });

        it('preserves query with min width and max width within option and value', async () => {
          await utils.assertPreserved({ minValue: 100, maxValue: 500 });
        });

        it('preserves query max width condition when no option width value', async () => {
          await utils.assertEdited(condition2, { minValue: 200 });
        });

        it('removes block with max width lesser than option min value', async () => {
          await utils.assertRemoved({ minValue: 500 });
        });

        it('preserves query min width condition when no option width value', async () => {
          await utils.assertEdited(condition1, { maxValue: 400 });
        });

        it('removes block with min width greater than option max value', async () => {
          await utils.assertRemoved({ maxValue: 100 });
        });
      });
    });

    [
      '(width > 400px) and (width < 200px)',
      '(width >= 400px) and (width <= 200px)',
      '(min-width: 400px) and (max-width: 200px)',
      '(400px <= width <= 200px)',
      '(400px < width < 200px)',
    ].forEach(inapplicableRangeVariant => {
      describe(inapplicableRangeVariant, () => {
        const utils = Utils(inapplicableRangeVariant);

        it('removes block with inapplicable range', async () => {
          await utils.assertRemoved();
        });
      });
    });

    [
      'print',
      '(orientation: landscape)',
      '(min-height: 100px)',
    ].forEach(unrelatedQueryVariant => {
      describe(unrelatedQueryVariant, () => {
        const queryUtils = Utils(unrelatedQueryVariant);
        const conditionUtils = Utils(`(width >= 200px) and ${unrelatedQueryVariant} and (width <= 400px)`);

        it('leaves unrelated query untouched', async () => {
          await queryUtils.assertPreserved({ minValue: 200, maxValue: 400 });
        });

        it('leaves unrelated condition along but collapses matching conditions', async () => {
          await conditionUtils.assertEdited(unrelatedQueryVariant, { minValue: 200, maxValue: 400 });
          await conditionUtils.assertEdited(`${unrelatedQueryVariant} and (width <= 400px)`, { minValue: 200 });
          await conditionUtils.assertEdited(`(width >= 200px) and ${unrelatedQueryVariant}`, { maxValue: 400 });
        });

        it('removes unrelated condition along with non-matching condition', async () => {
          await conditionUtils.assertRemoved({ maxValue: 100 });
          await conditionUtils.assertRemoved({ minValue: 500 });
        });
      });
    });

    [
      '(width >= 20em) and (width <= 40em)',
      '(width >= 20rem) and (width <= 40rem)',
    ].forEach(nonPixelWidthVariant => {
      describe(nonPixelWidthVariant, () => {
        const utils = Utils(nonPixelWidthVariant);

        it('leaves non pixel based query untouched', async () => {
          await utils.assertPreserved({ minValue: 25, maxValue: 35 });
        });
      });
    });

    describe('correctly interprets range despite multiple gt / lt points', () => {
      [
        '(width > 100px) and (width > 200px)',
        '(width > 200px) and (width > 100px)',
        '(width > 200px) and (width > 100px) and (width > 0px)',
      ].forEach(multipleGtWidthConditions => {
        const utils = Utils(multipleGtWidthConditions);

        it(multipleGtWidthConditions, async () => {
          await utils.assertEdited('(width > 200px)', { minValue: 150 });
        });
      });

      [
        '(width < 400px) and (width < 500px)',
        '(width < 500px) and (width < 400px)',
        '(width < 500px) and (width < 400px) and (width < 600px)',
      ].forEach(multipleLtConditions => {
        const utils = Utils(multipleLtConditions);

        it(multipleLtConditions, async () => {
          await utils.assertEdited('(width < 400px)', { maxValue: 450 });
        });
      });
    });

    describe('invalid media queries', () => {
      [
      '(width < )',
      '( > width)',
      '(width  200px)',
      '(200px  width)',
      '(200px => width)',
      '(width =< 200px)',
      ].forEach(weirdInputVariant => {
        it(weirdInputVariant, async () => {
          await Utils(weirdInputVariant).assertPreserved({ maxValue: 450 });
        });
      });
    });

    describe('multiple queries in query list', () => {
      const queries = [
        '(width <= 100px)',
        '(width >= 300px) and (width <= 400px)',
        '(width >= 600px)',
      ];
      it('filters queries separately', async () => {
        const queryListUtils = Utils(queries.join(', '));

        await queryListUtils.assertEdited(queries[0], { maxValue: 200 });
        await queryListUtils.assertEdited(queries[1], { minValue: 200, maxValue: 500 });
        await queryListUtils.assertEdited(queries[2], { minValue: 500 });
      });
    });

    if (atRuleType === '@import') {
      it('empty rule', async () => {
        const input = '@import ;';
        await assert(input, {minValue: 200}, input);
      });

      describe('handles import rules of all formats', () => {
        [
          // 'url(./file.css)',
          'url(\'./file.css\')',
          'url("./file.css")',
          '\'./file.css\'',
          '"./file.css"',
        ].forEach(fileUrl => {
          it(fileUrl, async () => {
            const input = `@import ${fileUrl} (width >= 200px);`;
            const collapsedOutput = `@import ${fileUrl};`;
            await assert(input, {minValue: 200}, collapsedOutput);
          });

          const supportsQuery = 'supports(display: flex)';
          it(`${fileUrl} ${supportsQuery}`, async () => {
            const input = `@import ${fileUrl} ${supportsQuery} (width >= 200px);`;
            const collapsedOutput = `@import ${fileUrl} ${supportsQuery};`;
            await assert(input, {minValue: 200}, collapsedOutput);
          });
        });
      });

      describe('preserves import rules without media queries', () => {
        [
          '',
          'supports(transform)',
        ].forEach((noCondition) => {
          const utils = Utils(noCondition);

          it(noCondition, async () => {
            await utils.assertPreserved();
          });
        });
      });
    }

    describe('filter', () => {
      const queries =
        '(width < 200px), ' +
        '(width >= 200px) and (width < 400px), ' +
        '(width >= 400px)';

      const [query1, query2, query3] = queries.split(', ');
      const utils = Utils(queries);

      it('removes query', async () => {
        await utils.assertRemoved({filter: () => false});
      });

      it('preserves query', async () => {
        await utils.assertPreserved({minValue: 600, filter: () => true});
      });

      it('preserves all conditions of query', async () => {
        await utils.assertPreserved({maxValue: 100, filter: () => [true, true]});
      });

      it('preserves some conditions of query', async () => {
        const queriesCondition1 = '(width < 200px), (width >= 200px), (width >= 400px)';
        await utils.assertEdited(queriesCondition1, {maxValue: 100, filter: () => [true, false]});

        const queriesCondition2 = '(width < 400px)';
        await utils.assertEdited(queriesCondition2, {maxValue: 100, filter: () => [false, true]});
      });

      it('collapses block', async () => {
        await utils.assertCollapsed({filter: () => [false, false]});
      });

      it('conditionally filters on query data', async () => {
        await utils.assertEdited(query1, {filter: query => query.source === query1});
        await utils.assertEdited(`${query2}, ${query3}`, {filter: query => query.source !== query1});
      });

      it('auto process on irrelevant queries', async () => {
        const stripSelectedQueries = query => {
          if (query.source === query1) return false;
          if (query.source === query3) return false;
        };
        const [condition1, condition2] = query2.split(' and ');
        await utils.assertEdited(condition1, {maxValue: 300, filter: stripSelectedQueries});
        await utils.assertEdited(condition2, {minValue: 300, filter: stripSelectedQueries});
      });

      it('auto process on irrelevant conditions', async () => {
        const autoQuery = '(width > 100px) and (width > 200px) and (width < 400px) and (width < 500px)';
        const autoUtils = Utils(autoQuery);
        await autoUtils.assertEdited('(width > 200px) and (width < 500px)', {
          minValue: 150,
          maxValue: 450,
          filter: () => [undefined, undefined, false, true],
        });
        await autoUtils.assertEdited('(width > 100px) and (width < 400px)', {
          minValue: 150,
          maxValue: 450,
          filter: () => [true, false, undefined, undefined],
        });
      });

      it('auto process on all conditions', async () => {
        const autoQuery = '(width >= 200px) and (width <= 400px)';
        const autoUtils = Utils(autoQuery);
        const autoAll = () => [undefined, undefined];
        await autoUtils.assertRemoved({maxValue: 100, filter: autoAll});
        await autoUtils.assertPreserved({filter: autoAll});
        await autoUtils.assertEdited('(width <= 400px)', {minValue: 250, filter: autoAll});
        await autoUtils.assertCollapsed({minValue: 250, maxValue: 350, filter: autoAll});
      });
    });
  });
});

function MediaUtils (conditions) {
  const template = mqList => `/* before */ @media ${mqList} { /* inside */ } /* after */`;
  const input = template(conditions);

  return {
    assertRemoved: opts => assert(input, opts, '/* before */ /* after */'),
    assertCollapsed: opts => assert(input, opts, '/* before */ /* inside */ /* after */'),
    assertPreserved: opts => assert(input, opts, input),
    assertEdited: (newConditions, opts) =>
      assert(input, opts, template(newConditions)),
  };
}

function ImportUtils (conditions) {
  const template = mqList => `/* before */ @import "./file.css" ${mqList}; /* after */`;
  const input = template(conditions);

  return {
    assertRemoved: opts => assert(input, opts, '/* before */ /* after */'),
    assertCollapsed: opts =>
      assert(input, opts, '/* before */ @import "./file.css"; /* after */'),
    assertPreserved: opts => assert(input, opts, input),
    assertEdited: (newConditions, opts) =>
      assert(input, opts, template(newConditions)),
  };
}

async function assert (input, opts, expected) {
  const actual = await run(input, opts);
  expect(actual).toEqual(expected);
}

async function run (input, opts) {
  const result = await postcss([plugin(opts)]).process(input, {
    from: undefined,
  });
  expect(result.warnings()).toHaveLength(0);
  return result.css;
}
