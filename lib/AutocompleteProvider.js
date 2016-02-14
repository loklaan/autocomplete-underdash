'use babel';

import fs from 'fs';
import path from 'path';
import { Range, Point } from 'atom';
import { filter, score } from 'fuzzaldrin';
import API_DATA from '../data/underscore-api.json';

const UNDERDASH_PREFIX = '_.';
const SELECTED_METHOD_KEY = '@@underdash_name';
const UNDERSCORE_DATA = mapUnderscoreApiToFormatted(API_DATA);
const UNDERSCORE_LOOKUP = constructMethodDictionary(UNDERSCORE_DATA);
const UNDERSCORE_METHODS = Object.keys(UNDERSCORE_LOOKUP);

class AutocompleteProvider {

  static selector = '.source.js, .source.coffee';

  static disableForSelector = '.source.js .comment, .source.coffee .comment';

  static getSuggestions({editor, bufferPosition, prefix}) {
    const method = getUnderdashMethodToken(editor, bufferPosition);
    // Shortcircuit this provider when we're not relevant (jeez go home mom)
    if (method === null) return null;

    return new Promise(resolve => {
      const typedPrefix = UNDERDASH_PREFIX + prefix.replace(/^(_?\.)/, '');

      const suggestions = filter(UNDERSCORE_METHODS, method)
        .map(constructSuggestion.bind(this, typedPrefix))
        .sort(sortWithFuzzaldrinScore.bind(this, typedPrefix));

      resolve(suggestions);

    });
  }

}

export default AutocompleteProvider;

/**
 * Returns an oject from the result of mapping our source api
 * data into a autocomplete-plus friendlier format.
 */
function mapUnderscoreApiToFormatted(data) {
  return data.reduce((mapped, entry) => {
    mapped[entry.name] = {
      name: entry.name,
      aliases: entry.aliases,
      type: 'function',
      url: entry.url,
      description: entry.description,
      // _.snippet(${1:arg1}, ${2:arg2}, ...)
      snippet: name => `${UNDERDASH_PREFIX}${name}(${entry.arguments.map(((arg, i) => `\$\{${i+1}:${arg}\}`)).join(', ')})`
    };
    return mapped;
  }, {});
}

function signature(name) {
  return `${UNDERDASH_PREFIX}${name}`;
}

/**
 * Creates a look dictionary for API shaped data, that maps method names to
 * preferred methods names, even if they're aliases.
 */
function constructMethodDictionary(mappedData) {
  return Object.keys(mappedData)
    .map(i => mappedData[i])
    .reduce((dict, entry) => {
      dict[entry.name] = entry.name;
      entry.aliases.forEach(alias => {
        dict[alias] = entry.name;
      })
      return dict;
    }, {})
}

/**
 * Attempts to get a partial token of the underdash function that is currently being typed into the editor.
 * @returns {String|null}
 */
function getUnderdashMethodToken(editor, bufferPosition) {
  const regex = /_\.(\w*)$/;
  const REGEX_METHOD_GROUP = 1;
  const line = editor.getTextInBufferRange(new Range(
    new Point(bufferPosition.row, 0), bufferPosition));

  const match = line.match(regex);
  return match ? match[REGEX_METHOD_GROUP] : null;
};

/**
 * Constructs an autocomplete-plus 'suggestion' object. Note that we have an
 * extra property used for internal tracking.
 */
function constructSuggestion(prefix, selectedMethod) {
  // A selected method could actually be an alias to a 'real' lib method name.
  // In this case, we want to show the user the alias, because it may their
  // preferred name, so move the 'real method name into the right label as an
  // alias.
  const apiEntry = UNDERSCORE_DATA[UNDERSCORE_LOOKUP[selectedMethod]];
  const aliases = [apiEntry.name].concat(apiEntry.aliases)
                    .filter(n => n !== selectedMethod)
                    .join(', ');

  return {
    [SELECTED_METHOD_KEY]: signature(selectedMethod),
    description: `${signature(apiEntry.name)} - ${apiEntry.description}`,
    descriptionMoreURL: apiEntry.url,
    type: apiEntry.type,
    snippet: apiEntry.snippet(selectedMethod),
    replacementPrefix: prefix,
    rightLabel: aliases,
  }
}

/**
 * Ordering function for an array. Descending order by positive fuzzaldin score.
 * @param  {String} query - The query used for scoring.
 * @param  {Object} a - Underdash suggestion object A.
 * @param  {Object} b - Underdash suggestion object B.
 * @return {Number}   Either 1 or -1
 */
function sortWithFuzzaldrinScore(query, a, b) {
  // The 'selected' method refers to the name taken from a set made of the 'real'
  // lib name and the alias names. See {@link constructSuggestion} for more details.
  return score(a[SELECTED_METHOD_KEY], query) > score(b[SELECTED_METHOD_KEY], query) ?
  -1 : 1;
}
