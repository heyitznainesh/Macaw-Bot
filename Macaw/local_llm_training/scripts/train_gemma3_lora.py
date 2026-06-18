import json
import os
from datasets import Dataset
from transformers import AutoTokenizer

# Training with LoRA requires peft + trl (or transformers+peft).
# This script is a template; you will run it after installing dependencies.

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "training_data.jsonl")

# Non-gated alternative base model (change if needed)
# This must be available without authentication.
BASE_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"
OUT_DIR = os.path.join(BASE_DIR, "output_lora_mistral")


def load_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            rows.append({"prompt": obj["prompt"], "answer": obj["answer"]})
    return rows


def main(max_examples=None):
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Missing dataset: {DATA_PATH}")

    rows = load_jsonl(DATA_PATH)
    ds = Dataset.from_list(rows)

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=False)

    def format_example(ex):
        # Use instruction format.
        # Keep it simple to encourage answer-only behavior.
        prompt = ex["prompt"].strip()
        answer = ex["answer"].strip()
        text = (
            "<|system|>તમે નખરા-લાલ (Gujarati) સહાયક છો. "
            "દસ્તાવેજના આધાર પર સચોટ જવાબ આપો. "
            "જવાબ ફક્ત ગુજરાતી માં આપવો. </|system|>\n"
            f"<|user|>{prompt}</|user|>\n"
            f"<|assistant|>{answer}</|assistant|>"
        )
        return {"text": text}

    ds = ds.map(format_example)

    # ---- LoRA/TRL imports (done here so script can be inspected without deps) ----
    from peft import LoraConfig
    from transformers import TrainingArguments
    from trl import SFTTrainer

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )

    args = TrainingArguments(
        output_dir=OUT_DIR,
        num_train_epochs=1,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        warmup_ratio=0.03,
        fp16=True,
        logging_steps=10,
        save_steps=200,
        save_total_limit=2,
        report_to="none",
    )

    trainer = SFTTrainer(
        model=BASE_MODEL,
        train_dataset=ds,
        args=args,
        peft_config=lora_config,
        processing_class=tokenizer,
    )

    # SFTTrainer v1.6.0 expects `text` to be returned by the dataset mapping.
    # Our dataset already contains a `text` field.


    trainer.train()
    trainer.save_model(OUT_DIR)


if __name__ == "__main__":
    main()

