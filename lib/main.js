"use babel";

import AutocompleteProvider from './AutocompleteProvider.js'

let ready = false;
let provider;

export function provide() {
  if (provider == null) {
    provider = AutocompleteProvider;
  }

  return provider;
}

export function activate() {
  console.log('activate called in autocomplete-underdash')
  ready = true;
}

export function deactivate() {
  console.log('deactivate called in autocomplete-underdash')
  ready = false;
}
