import json
import os
import re
import random
from typing import List, Dict

from docx import Document

# Notes:
# - This script builds a JSONL dataset from the two DOCX files.
# - It creates Q/A pairs in Gujarati by extracting likely question-answer spans
#   using simple heuristics (headings -> questions, sentences -> answers).
# - You can improve quality later by editing the generated JSONL.

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# DOCX files are at project root (same level as local_llm_training/ and Untitled-1.html)
DOCS_DIR = BASE_DIR  # update if you move docs
OUT_PATH = os.path.join(BASE_DIR, "data", "training_data.jsonl")

# If docs aren't found, fall back to searching one level up from this script
if not os.path.exists(os.path.join(DOCS_DIR, "About Gujarat (1).docx")):
    repo_root = os.path.dirname(BASE_DIR)
    DOCS_DIR = repo_root

DOC_FILES = [
    os.path.join(DOCS_DIR, "About Gujarat (1).docx"),
    os.path.join(DOCS_DIR, "UnitedGujarati Convention profile (1).docx"),
]


def normalize_text(s: str) -> str:
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def split_sentences(text: str) -> List[str]:
    # Works reasonably for mixed Gujarati/English punctuation.
    parts = re.split(r"(?<=[.!?।])\s+", text)
    out = []
    for p in parts:
        p = normalize_text(p)
        if len(p) >= 30:
            out.append(p)
    return out


def doc_to_blocks(docx_path: str) -> List[str]:
    doc = Document(docx_path)
    blocks = []
    cur = []
    for para in doc.paragraphs:
        t = normalize_text(para.text)
        if not t:
            continue
        # treat headings/short lines as separators
        if len(t) <= 60 and t.lower() != "about":
            if cur:
                blocks.append(" ".join(cur))
                cur = []
            blocks.append(t)
        else:
            cur.append(t)
    if cur:
        blocks.append(" ".join(cur))
    return blocks


def make_question_from_heading(h: str) -> str:
    # Gujarati-friendly generic patterns
    h2 = h.strip()
    # Remove trailing numbering
    h2 = re.sub(r"^\d+\.?\s*", "", h2)
    if re.search(r"(Gujarat|ABOUT|ABOUT FOGAUSA|ABOUT GUJARAT STATE)", h2, re.I):
        return "ગુજરાત વિશે સંક્ષેપમાં સમજાવો?"
    # If heading looks like a topic name, turn into a Gujarati question
    if len(h2) >= 4:
        return f"{h2} શું છે અને તેમાં મુખ્ય મુદ્દા કયા છે?"
    return "આ વિષય વિશે સમજાવો"


def make_qa_pairs_from_blocks(blocks: List[str]) -> List[Dict[str, str]]:
    qas = []
    i = 0
    while i < len(blocks):
        b = blocks[i]
        # heading-like blocks are often shorter
        if len(b) <= 120:
            # take next 1-3 blocks as answer context
            ans_parts = []
            for j in range(i + 1, min(i + 4, len(blocks))):
                if len(blocks[j]) > 80:
                    ans_parts.append(blocks[j])
            if ans_parts:
                ans = " ".join(ans_parts)
                ans_sents = split_sentences(ans)
                if ans_sents:
                    ans = " ".join(ans_sents[:5])
                q = make_question_from_heading(b)
                # NOTE: We will NOT translate here; we keep text as-is.
                # Gujarati model can still learn from mixed text.
                qas.append({"prompt": q, "answer": ans})
                i += 1
                continue
        i += 1

    # Also create factoid QAs from longer sentence sets
    # (Extract sentences containing keywords and convert to question)
    keywords = ["Gujarat", "FOGAUSA", "FOGA", "Lothal", "Somnath", "Gandhi", "Patel", "Gir", "Kutch", "Narmada", "tiger", "lion"]
    flat_text = " ".join([b for b in blocks if b and len(b) >= 40])
    sents = split_sentences(flat_text)
    random.shuffle(sents)
    for s in sents:
        if any(k.lower() in s.lower() for k in keywords) and len(s) >= 50:
            # Create a question that asks about the entity
            ent = next((k for k in keywords if k.lower() in s.lower()), "આ વિષય")
            q = f"{ent} વિશે માહિતી આપો (મુખ્ય મુદ્દા સાથે)."
            qas.append({"prompt": q, "answer": s})
        if len(qas) >= 220:
            break

    return qas


def main():
    all_qas = []
    for path in DOC_FILES:
        if not os.path.exists(path):
            print(f"Missing docx: {path}")
            continue
        blocks = doc_to_blocks(path)
        qas = make_qa_pairs_from_blocks(blocks)
        # sanitize
        for qa in qas:
            qa["prompt"] = normalize_text(qa["prompt"])
            qa["answer"] = normalize_text(qa["answer"])
        all_qas.extend(qas)

    # Deduplicate by prompt+first 80 chars
    seen = set()
    dedup = []
    for qa in all_qas:
        key = qa["prompt"] + "||" + qa["answer"][:80]
        if key in seen:
            continue
        seen.add(key)
        dedup.append(qa)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        for qa in dedup:
            rec = {
                "prompt": qa["prompt"],
                "answer": qa["answer"],
            }
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Wrote {len(dedup)} training pairs to {OUT_PATH}")


if __name__ == "__main__":
    main()

