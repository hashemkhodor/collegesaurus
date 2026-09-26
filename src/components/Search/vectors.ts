/**
 * Vector maths shared by the index build and the browser. Vectors travel as
 * one signed byte per dimension plus a scale, a quarter of float32's size.
 */

export type Quantized = {scale: number; q: Int8Array};

export function quantize(vector: ArrayLike<number>): Quantized {
  let max = 0;
  for (let i = 0; i < vector.length; i += 1) {
    max = Math.max(max, Math.abs(vector[i]));
  }
  const q = new Int8Array(vector.length);
  if (max === 0) {
    return {scale: 0, q};
  }
  const scale = max / 127;
  for (let i = 0; i < vector.length; i += 1) {
    q[i] = Math.round(vector[i] / scale);
  }
  return {scale, q};
}

export function unit(vector: ArrayLike<number>): Float32Array | null {
  let sum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    sum += vector[i] * vector[i];
  }
  if (sum === 0) {
    return null;
  }
  const norm = Math.sqrt(sum);
  return Float32Array.from(vector, (value) => value / norm);
}

/** Gemini embeddings are Matryoshka-trained, so their leading dimensions are a smaller embedding. */
export function truncate(vector: ArrayLike<number>, dims: number): Float32Array {
  return unit(Array.from(vector).slice(0, dims)) ?? new Float32Array(dims);
}

export function composeQuery(parts: {vector: Quantized; weight: number}[]): Float32Array | null {
  if (parts.length === 0) {
    return null;
  }
  const sum = new Float32Array(parts[0].vector.q.length);
  for (const {vector, weight} of parts) {
    const factor = weight * vector.scale;
    for (let d = 0; d < sum.length; d += 1) {
      sum[d] += factor * vector.q[d];
    }
  }
  return unit(sum);
}

/** Row n of `matrix` is stored vector n; stored vectors were unit length, so this is cosine similarity. */
export function scoreAll(query: Float32Array, matrix: Int8Array, scales: ArrayLike<number>): Float32Array {
  const dims = query.length;
  const scores = new Float32Array(scales.length);
  for (let n = 0; n < scales.length; n += 1) {
    const offset = n * dims;
    let dot = 0;
    for (let d = 0; d < dims; d += 1) {
      dot += query[d] * matrix[offset + d];
    }
    scores[n] = dot * scales[n];
  }
  return scores;
}

export function toBase64(bytes: Int8Array): string {
  const raw = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let binary = '';
  for (let i = 0; i < raw.length; i += 0x8000) {
    binary += String.fromCharCode(...raw.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64(text: string): Int8Array {
  const binary = atob(text);
  const raw = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    raw[i] = binary.charCodeAt(i);
  }
  return new Int8Array(raw.buffer);
}
