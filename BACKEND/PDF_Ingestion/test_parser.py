import pymupdf

doc = pymupdf.open("test_pdf.pdf")

for page_number, page in enumerate(doc, start=1):

    text = page.get_text("text", sort=True)

    with open(
        f"page_{page_number}.txt",
        "w",
        encoding="utf-8"
    ) as f:
        f.write(text)

doc.close()