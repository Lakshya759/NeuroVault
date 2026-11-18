
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Initial chunking configuration
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 3000,
    chunkOverlap: 400,

    separators: [
        "\n\n",
        "\n",
        ". ",
        " ",
        ""
    ],

    keepSeparator: true,
    addStartIndex: true,
});


// Extract Markdown heading hierarchy and section boundaries
function extractSections(markdown) {

    const lines = markdown.split("\n");

    const sections = [];

    const headingStack = [];

    let currentSection = null;
    let position = 0;

    for (const line of lines) {

        const lineLength = line.length + 1;

        const headingMatch = line.match(
            /^(#{1,6})\s+(.+?)\s*$/
        );

        if (headingMatch) {

            // Save the previous section
            if (currentSection) {
                currentSection.end = position;

                sections.push(currentSection);
            }

            const level = headingMatch[1].length;

            const heading = headingMatch[2]
                .replace(/\*\*/g, "")
                .replace(/__/g, "")
                .trim();

            // Maintain heading hierarchy
            headingStack.length = level - 1;

            headingStack[level - 1] = heading;

            const headingPath = [...headingStack];

            currentSection = {
                headingPath,
                heading,
                headingLevel: level,
                start: position + lineLength,
                end: markdown.length
            };
        }

        position += lineLength;
    }

    // Save final section
    if (currentSection) {
        currentSection.end = markdown.length;
        sections.push(currentSection);
    }

    // Handle documents without Markdown headings
    if (sections.length === 0) {
        return [{
            headingPath: [],
            heading: null,
            headingLevel: 0,
            start: 0,
            end: markdown.length
        }];
    }

    // Preserve content before the first heading
    const firstHeadingStart = sections[0].start -
        (markdown.slice(0, sections[0].start).split("\n").pop()?.length || 0);

    if (firstHeadingStart > 0) {
        sections.unshift({
            headingPath: [],
            heading: null,
            headingLevel: 0,
            start: 0,
            end: firstHeadingStart
        });
    }

    return sections;
}


// Main chunking function
const chunkText = async (
    markdown,
    pageMap = [],
    documentId = null
) => {

    if (!markdown?.trim()) {
        return [];
    }

    const sections = extractSections(markdown);

    const chunks = [];

    for (const section of sections) {

        const sectionText = markdown.slice(
            section.start,
            section.end
        ).trim();

        if (!sectionText) continue;

        const documents = await splitter.createDocuments(
            [sectionText],
            [{
                documentId,
                headingPath: section.headingPath,
                heading: section.heading,
                headingLevel: section.headingLevel
            }]
        );

        for (const doc of documents) {

            const localStart = doc.metadata.start_index ?? 0;

            const startIndex = section.start + localStart;

            const endIndex = startIndex + doc.pageContent.length;

            // Find corresponding PDF pages
            const relevantPages = pageMap
                .filter(page =>
                    page.start < endIndex &&
                    page.end > startIndex
                )
                .map(page => page.page);

            const headingPath = section.headingPath;

            // Construct enriched embedding text
            const headingContext = headingPath.length
                ? headingPath
                    .map((heading, index) =>
                        `${"Heading ".repeat(0)}${heading}`
                    )
                    .join(" > ")
                : "General Document Content";

            const embeddingText = `
Document Section: ${headingContext}

${doc.pageContent}
`.trim();

            chunks.push({

                chunkIndex: chunks.length,

                // Original content
                content: doc.pageContent,

                // Content sent to embedding model
                embeddingText,

                metadata: {
                    documentId,

                    section: headingPath[0] || null,

                    subsection: headingPath.length > 1
                        ? headingPath[headingPath.length - 1]
                        : null,

                    headingPath,

                    headingLevel: section.headingLevel,

                    startIndex,
                    endIndex,

                    pageStart: relevantPages.length
                        ? Math.min(...relevantPages)
                        : null,

                    pageEnd: relevantPages.length
                        ? Math.max(...relevantPages)
                        : null,

                    pages: relevantPages
                }
            });
        }
    }

    return chunks;
};

export default chunkText;




// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// const splitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000,
//     chunkOverlap: 200,
// });

// const chunkText = async (text) => {
//     if (!text?.trim()) {
//         return [];
//     }

//     const chunks = await splitter.splitText(text);

//     return chunks;
// };

// export default  chunkText;