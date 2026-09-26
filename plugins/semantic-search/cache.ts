/**
 * Embeddings already paid for, kept between builds (CI restores the directory
 * with actions/cache), so a rebuild only embeds text that changed. One
 * append-only file per model and size: records of a sha256 of the task type
 * and text, then the vector's scale and bytes.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {quantize, type Quantized} from '../../src/components/Search/vectors.ts';
import type {TaskType} from './gemini.ts';

const DIGEST_BYTES = 32;

function digest(taskType: TaskType, text: string): string {
  return crypto.createHash('sha256').update(`${taskType}\n${text}`).digest('hex');
}

export class VectorCache {
  private readonly file: string;
  private readonly dims: number;
  private readonly entries: Map<string, Quantized>;
  private readonly pending: [string, Quantized][] = [];

  private constructor(file: string, dims: number, entries: Map<string, Quantized>) {
    this.file = file;
    this.dims = dims;
    this.entries = entries;
  }

  static async open(dir: string, model: string, dims: number): Promise<VectorCache> {
    const file = path.join(dir, `${model.replace(/[^\w.-]/g, '_')}-${dims}.bin`);
    const entries = new Map<string, Quantized>();
    const record = DIGEST_BYTES + 4 + dims;
    const data = await fs.readFile(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    });
    if (data) {
      const whole = data.length - (data.length % record);
      for (let offset = 0; offset < whole; offset += record) {
        const start = offset + DIGEST_BYTES;
        entries.set(data.toString('hex', offset, start), {
          scale: data.readFloatLE(start),
          q: new Int8Array(data.subarray(start + 4, offset + record)),
        });
      }
      if (whole < data.length) {
        // A build stopped mid-write; later records must start on a boundary.
        await fs.truncate(file, whole);
      }
    }
    return new VectorCache(file, dims, entries);
  }

  get size(): number {
    return this.entries.size;
  }

  get(taskType: TaskType, text: string): Quantized | undefined {
    return this.entries.get(digest(taskType, text));
  }

  set(taskType: TaskType, text: string, vector: ArrayLike<number>): Quantized {
    const key = digest(taskType, text);
    const value = quantize(vector);
    if (!this.entries.has(key)) {
      this.pending.push([key, value]);
    }
    this.entries.set(key, value);
    return value;
  }

  async save(): Promise<void> {
    if (this.pending.length === 0) {
      return;
    }
    const record = DIGEST_BYTES + 4 + this.dims;
    const out = Buffer.alloc(record * this.pending.length);
    this.pending.forEach(([key, {scale, q}], i) => {
      const offset = i * record;
      out.write(key, offset, 'hex');
      out.writeFloatLE(scale, offset + DIGEST_BYTES);
      out.set(new Uint8Array(q.buffer, q.byteOffset, q.byteLength), offset + DIGEST_BYTES + 4);
    });
    await fs.mkdir(path.dirname(this.file), {recursive: true});
    await fs.appendFile(this.file, out);
    this.pending.length = 0;
  }
}

export type Embed = (texts: string[], taskType: TaskType) => Promise<ArrayLike<number>[]>;

/** Vectors for `texts`, in order, embedding each text the cache lacks once. */
export async function embedWithCache(
  texts: string[],
  taskType: TaskType,
  cache: VectorCache,
  embed: Embed,
): Promise<Quantized[]> {
  const missing = [...new Set(texts.filter((text) => !cache.get(taskType, text)))];
  if (missing.length > 0) {
    const vectors = await embed(missing, taskType);
    missing.forEach((text, i) => cache.set(taskType, text, vectors[i]));
  }
  return texts.map((text) => cache.get(taskType, text)!);
}
