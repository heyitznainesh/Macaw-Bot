# TODO
- [ ] Extract text from `About Gujarat (1).docx` and `UnitedGujarati Convention profile (1).docx` into a training-ready format (Q/A pairs in Gujarati).
- [ ] Create local fine-tuning training dataset (JSONL) in a new folder (no frontend changes).
- [ ] Write a local training script (LoRA/QLoRA) for `gemma3:4b` using the dataset.
- [ ] Add instructions to run the training and verify the produced LoRA adapter.
- [ ] Update Ollama/local serving config to use the fine-tuned adapter (so frontend keeps working).
- [ ] Provide test prompts and expected behavior.

