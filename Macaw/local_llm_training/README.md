# Local LoRA fine-tuning for gemma3:4b (Nakhra-Lal)

This folder contains scripts to create a training dataset from your two DOCX files and fine-tune a local model.

## 1) Create training pairs from DOCX
1. Install Python deps (local):

- Windows (PowerShell):
  - `py -m pip install python-docx datasets transformers peft trl accelerate`

2. Run extraction:

- `py extract_training_pairs.py`

This writes:
- `data/training_data.jsonl`

## 2) Train LoRA
Run:
- `py scripts/train_gemma3_lora.py`

Output:
- `output_gemma3_lora/`

## 3) Hook into Ollama
You must export/convert the LoRA adapter to a format Ollama can load.
That conversion step depends on your chosen Ollama workflow.

(We will implement this step once you confirm:
- whether you have an Ollama Modelfile flow in place, and
- which gemma3 base you use in Ollama.)

