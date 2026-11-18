
import json
import re
import unicodedata
import hashlib
import sys
import os

from collections import Counter
from importlib.metadata import version

import pymupdf
import pymupdf4llm


def clean(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)

    # Join words split across lines
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Remove trailing spaces before newlines
    text = re.sub(r"[ \t]+\n", "\n", text)

    # Normalize excessive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def normalize_line(line: str) -> str:
    line = line.strip().lower()
    line = re.sub(r"\d+", "#", line)
    return line


def drop_repeated_lines(pages: list[str], min_share=0.4):

    if len(pages) < 4:
        return pages

    candidates = Counter()

    for page in pages:
        lines = page.splitlines()
        edge_lines = lines[:2] + lines[-2:]

        candidates.update({
            normalize_line(line)
            for line in edge_lines
            if 0 < len(line.strip()) < 80
        })

    threshold = len(pages) * min_share

    repeated = {
        line for line, count in candidates.items()
        if count >= threshold
    }

    cleaned_pages = []

    for page in pages:
        lines = page.splitlines()
        result = []

        for index, line in enumerate(lines):

            is_edge = (
                index < 2 or index >= len(lines) - 2
            )

            if is_edge and normalize_line(line) in repeated:
                continue

            result.append(line)

        cleaned_pages.append("\n".join(result))

    return cleaned_pages


def pdf_to_markdown(path: str):

    with pymupdf.open(path) as doc:

        pages = pymupdf4llm.to_markdown(
            doc,
            page_chunks=True,
            ignore_images=False,
            ignore_graphics=False
        )

        texts = [
            clean(page["text"])
            for page in pages
        ]

        texts = drop_repeated_lines(texts)

        markdown_parts = []
        page_map = []
        position = 0

        for page_number, text in enumerate(texts, start=1):

            start = position

            markdown_parts.append(text)

            position += len(text)

            end = position

            page_map.append({
                "page": page_number,
                "start": start,
                "end": end
            })

            position += 2

        markdown = "\n\n".join(markdown_parts)

        pdf_outline = doc.get_toc()

        content_hash = hashlib.sha256(
            markdown.encode("utf-8")
        ).hexdigest()

        return {
            "markdown": markdown,
            "page_map": page_map,
            "pdf_outline": pdf_outline,
            "content_hash": content_hash,
            "parser_ver": version("pymupdf4llm")
        }


if __name__ == "__main__":

    original_stdout = None

    try:
        if len(sys.argv) < 2:
            raise ValueError("PDF path argument is missing")

        pdf_path = sys.argv[1]

        # Save original stdout file descriptor
        original_stdout = os.dup(1)

        try:
            # Redirect OS-level stdout to stderr
            os.dup2(2, 1)

            # Perform PDF extraction
            result = pdf_to_markdown(pdf_path)

        finally:
            # Restore original stdout
            os.dup2(original_stdout, 1)
            os.close(original_stdout)
            original_stdout = None

        # Only JSON goes to stdout
        sys.stdout.write(
            json.dumps(result, ensure_ascii=False)
        )

        sys.stdout.write("\n")
        sys.stdout.flush()

    except Exception as e:

        print(
            f"PDF parsing failed: {e}",
            file=sys.stderr
        )

        sys.exit(1)
