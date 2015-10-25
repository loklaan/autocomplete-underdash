'use babel';

import fs from 'fs';
import path from 'path';
import { Range, Point } from 'atom';
import { filter } from 'fuzzaldrin';
import API_DATA from '../data/underscore-api.json';

const FORMATTED_API_DATA = mapApiToSuggestionFormat(API_DATA);
const API_METHOD_NAMES = Object.keys(FORMATTED_API_DATA);

class AutocompleteProvider {

  static selector = '.source.js, .source.coffee'

  static disableForSelector = '.source.js .comment, .source.coffee .comment'

  static inclusionPriority = 2
  static excludeLowerPriority = true

  static getSuggestions({editor, bufferPosition}) {
    const prefix = getPrefix(editor, bufferPosition);
    if (prefix.length === 0) return [];
    const method = prefix.slice('_.'.length);

    const suggestions = filter(API_METHOD_NAMES, method).map(constructSuggestionFromMethodName.bind(this, prefix));

    return suggestions;
  }

}

export default AutocompleteProvider;

/**
 * Returns an oject from the result of mapping our source api
 * data into a autocomplete-plus friendlier format.
 */
function mapApiToSuggestionFormat(data) {
  return data.reduce((mapped, entry) => {
    mapped[entry.name] = {
      signature: `_.${entry.name}`,
      type: 'function',
      url: entry.url,
      description: entry.description,
      // _.snippet(${1:arg1}, ${2:arg2})
      snippet: `_.${entry.name}(${entry.arguments.map(((arg, i) => `\$\{${i+1}:${arg}\}`)).join(', ')})`
    };
    return mapped;
  }, {});
}

/**
 * Will return a prefix unless we're missing a '_.', else null
 */
function getPrefix(editor, bufferPosition) {
  const regex = /_\.\w*$/;
  const line = editor.getTextInBufferRange(new Range(
    new Point(bufferPosition.row, 0), bufferPosition));

  const match = line.match(regex);
  if (match) return match[0];
  else return '';
};

/**
 * Constructs an autocomplete-plus 'suggestion' object
 */
function constructSuggestionFromMethodName(prefix, name) {
  const apiEntry = FORMATTED_API_DATA[name];

  return {
    displayText: apiEntry.signature,
    description: apiEntry.description,
    descriptionMoreURL: apiEntry.url,
    type: apiEntry.type,
    snippet: apiEntry.snippet,
    replacementPrefix: prefix
  }
}
