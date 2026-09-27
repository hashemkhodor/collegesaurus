/**
 * Embeds text with an open multilingual model at build time:
 * multilingual-e5-small (MIT), exported to ONNX and run by ONNX Runtime. Its
 * files are downloaded once into the cache directory. Nothing is called at
 * search time and nothing needs a key.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {unit} from '../../src/components/Search/vectors.ts';

/** The ONNX export of intfloat/multilingual-e5-small. */
export const MODEL = 'Xenova/multilingual-e5-small';
// Pinned so a change on Hugging Face can't silently change what a build
// downloads and runs; bump by hand after checking the new commit.
export const REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
// Also pinned: e5-base, the only other model plugins/semantic-search/eval.ts
// benchmarks against. A model tried ad hoc downloads from its default branch.
const REVISIONS: Record<string, string> = {
  [MODEL]: REVISION,
  'Xenova/multilingual-e5-base': '1ec9243030a27d1a115d5c340572074c125b58b2',
};
const FILES = ['tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx'];

export type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

// e5 was trained to tell a search from the text it should find by these.
const PREFIXES: Record<TaskType, string> = {RETRIEVAL_QUERY: 'query: ', RETRIEVAL_DOCUMENT: 'passage: '};

export type Model = {
  /** Where the model came from, e.g. its Hugging Face repository; cached vectors are kept per model. */
  name: string;
  dims: number;
  tokenize: (text: string) => {ids: number[]; attention_mask: number[]};
  /** Token states for a padded batch: `data` is batch × tokens × dims. */
  run: (batch: {ids: number[][]; mask: number[][]}) => Promise<{data: Float32Array; dims: [number, number, number]}>;
  padId: number;
};

/** One unit vector per text, in order: the mean of its token states. */
export async function embedWith(
  texts: string[],
  taskType: TaskType,
  model: Model,
  {batchSize = 32, maxTokens = 512} = {},
): Promise<Float32Array[]> {
  const encoded = texts.map((text) => {
    const {ids, attention_mask: mask} = model.tokenize(PREFIXES[taskType] + text);
    if (ids.length <= maxTokens) {
      return {ids, mask};
    }
    // Keep the end token, which the model always saw last.
    return {ids: [...ids.slice(0, maxTokens - 1), ids.at(-1)!], mask: mask.slice(0, maxTokens)};
  });
  // Texts of similar length share a batch, so little is spent on padding.
  const order = [...encoded.keys()].sort((a, b) => encoded[a].ids.length - encoded[b].ids.length);
  const vectors: Float32Array[] = [];
  for (let start = 0; start < order.length; start += batchSize) {
    const members = order.slice(start, start + batchSize);
    const length = Math.max(...members.map((i) => encoded[i].ids.length));
    const pad = (row: number[], value: number) => [...row, ...Array<number>(length - row.length).fill(value)];
    const ids = members.map((i) => pad(encoded[i].ids, model.padId));
    const mask = members.map((i) => pad(encoded[i].mask, 0));
    const {
      data,
      dims: [, tokens, width],
    } = await model.run({ids, mask});
    members.forEach((i, b) => {
      const sum = new Float32Array(width);
      for (let t = 0; t < tokens; t += 1) {
        if (mask[b][t] === 1) {
          const offset = (b * tokens + t) * width;
          for (let d = 0; d < width; d += 1) {
            sum[d] += data[offset + d];
          }
        }
      }
      vectors[i] = unit(sum) ?? sum;
    });
  }
  return vectors;
}

async function exists(file: string): Promise<boolean> {
  return fs.stat(file).then(
    () => true,
    () => false,
  );
}

/** The model's files under `dir`, downloaded from Hugging Face the first time. Returns its folder. */
export async function downloadModel(dir: string, model = MODEL, send: typeof fetch = fetch): Promise<string> {
  const root = path.join(dir, model);
  for (const file of FILES) {
    const target = path.join(root, file);
    if (await exists(target)) {
      continue;
    }
    const response = await send(`https://huggingface.co/${model}/resolve/${REVISIONS[model] ?? 'main'}/${file}`);
    if (!response.ok) {
      throw new Error(`${model}/${file}: HTTP ${response.status}`);
    }
    await fs.mkdir(path.dirname(target), {recursive: true});
    // Renamed into place only when complete, so a broken download is never taken for the file.
    const partial = `${target}.part`;
    await fs.writeFile(partial, Buffer.from(await response.arrayBuffer()));
    await fs.rename(partial, target);
  }
  return root;
}

export async function loadModel(dir: string, name = MODEL, send: typeof fetch = fetch): Promise<Model> {
  const root = await downloadModel(dir, name, send);
  const [{Tokenizer}, ort] = await Promise.all([import('@huggingface/tokenizers'), import('onnxruntime-node')]);
  const json = JSON.parse(await fs.readFile(path.join(root, 'tokenizer.json'), 'utf8'));
  const config = JSON.parse(await fs.readFile(path.join(root, 'tokenizer_config.json'), 'utf8'));
  const tokenizer = new Tokenizer(json, config);
  const session = await ort.InferenceSession.create(path.join(root, 'onnx', 'model_quantized.onnx'));
  const padId: number = json.added_tokens.find((token: {content: string}) => token.content === config.pad_token)?.id ?? 1;
  const tensor = (rows: number[][]) =>
    new ort.Tensor('int64', BigInt64Array.from(rows.flat(), BigInt), [rows.length, rows[0].length]);
  const model: Model = {
    name,
    dims: 0,
    padId,
    tokenize: (text) => {
      const {ids, attention_mask} = tokenizer.encode(text);
      return {ids, attention_mask};
    },
    run: async ({ids, mask}) => {
      const feeds: Record<string, InstanceType<typeof ort.Tensor>> = {
        input_ids: tensor(ids),
        attention_mask: tensor(mask),
      };
      if (session.inputNames.includes('token_type_ids')) {
        feeds.token_type_ids = tensor(ids.map((row) => row.map(() => 0)));
      }
      const {last_hidden_state: states} = await session.run(feeds);
      return {data: states.data as Float32Array, dims: states.dims as [number, number, number]};
    },
  };
  const [probe] = await embedWith(['dimensions'], 'RETRIEVAL_QUERY', model);
  return {...model, dims: probe.length};
}
