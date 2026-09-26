# General word lists

Search gives each of these words a vector at build time, so a word the pages
never use (a synonym such as "coding" for "computer science") still finds
them. They are the whole words of three open tokenizer vocabularies, made by
`fetch.ts`:

| File | Source | License |
|---|---|---|
| `en.txt` | [google-bert/bert-base-uncased](https://huggingface.co/google-bert/bert-base-uncased) `vocab.txt` | Apache-2.0 |
| `fr.txt` | [almanach/camembert-base](https://huggingface.co/almanach/camembert-base) `tokenizer.json` | MIT |
| `ar.txt` | [CAMeL-Lab/bert-base-arabic-camelbert-mix](https://huggingface.co/CAMeL-Lab/bert-base-arabic-camelbert-mix) `vocab.txt` | Apache-2.0 |
