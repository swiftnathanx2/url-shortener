import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsvCell } from '#src/utils/csv.js';

test('wraps a value containing a comma in quotes', () => {
  assert.equal(toCsvCell('a,b'), '"a,b"');
});

test('doubles quotes inside a value', () => {
  assert.equal(toCsvCell('say "hi"'), '"say ""hi"""');
});

test('defuses a value that looks like a formula', () => {
  assert.equal(toCsvCell('=1+1'), "'=1+1");
});

test('turns null into an empty cell', () => {
  assert.equal(toCsvCell(null), '');
});
