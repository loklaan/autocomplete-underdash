'use babel';

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
  ready = true;
}

export function deactivate() {
  ready = false;
}
