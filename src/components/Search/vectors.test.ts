// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {composeQuery, dequantize, fromBase64, quantize, scoreAll, toBase64, unit} from './vectors.ts';

function close(actual: ArrayLike<number>, expected: number[], tolerance = 1e-3) {
  assert.equal(actual.length, expected.length);
  expected.forEach((value, i) => {
    assert.ok(Math.abs(actual[i] - value) <= tolerance, `[${i}] ${actual[i]} is not ${value}`);
  });
}

test('stores a vector as bytes scaled to its largest value', () => {
  const {scale, q} = quantize([0.5, -1, 0.25]);

  assert.deepEqual([...q], [64, -127, 32]);
  close([scale], [1 / 127], 1e-9);
});

test('reads stored bytes back as the vector they stand for', () => {
  close(dequantize(quantize([0.5, -1, 0.25])), [64 / 127, -1, 32 / 127], 1e-6);
});

test('stores an all-zero vector without dividing by zero', () => {
  const {scale, q} = quantize([0, 0]);

  assert.equal(scale, 0);
  assert.deepEqual([...q], [0, 0]);
});

test('scales a vector to unit length, or gives up on a zero one', () => {
  close(unit([3, 4])!, [0.6, 0.8]);
  assert.equal(unit([0, 0]), null);
});

test('weights each word of a query before averaging', () => {
  const query = composeQuery([
    {vector: quantize([1, 0]), weight: 1},
    {vector: quantize([0, 1]), weight: 3},
  ]);

  close(query!, [1 / Math.sqrt(10), 3 / Math.sqrt(10)]);
});

test('has no query vector without a weighted word', () => {
  assert.equal(composeQuery([]), null);
  assert.equal(composeQuery([{vector: quantize([1, 0]), weight: 0}]), null);
});

test('scores every stored vector by cosine similarity', () => {
  const docs = [[1, 0], [0, 1], [0.6, 0.8]].map(quantize);
  const matrix = new Int8Array(docs.flatMap(({q}) => [...q]));
  const scales = docs.map(({scale}) => scale);

  close(scoreAll(new Float32Array([0.6, 0.8]), matrix, scales), [0.6, 0.8, 1], 1e-2);
});

test('sends vector bytes as base64 and reads back the same bytes', () => {
  const bytes = new Int8Array([-128, -1, 0, 1, 127]);

  assert.deepEqual([...fromBase64(toBase64(bytes))], [-128, -1, 0, 1, 127]);
});
