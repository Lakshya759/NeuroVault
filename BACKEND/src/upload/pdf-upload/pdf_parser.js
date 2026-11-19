
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Python project location
const PYTHON_PROJECT_PATH = path.resolve(
    __dirname,
    "../../../PDF_Ingestion"
);

const PYTHON_SCRIPT_PATH = path.join(
    PYTHON_PROJECT_PATH,
    "pdf_parser.py"
);

// uv executable
const UV_PATH = process.env.UV_BIN || "uv";

export async function parsePDF(pdfPath) {
    try {

        // 1. Validate paths
        if (!fs.existsSync(PYTHON_PROJECT_PATH)) {
            throw new Error(
                `Python project not found: ${PYTHON_PROJECT_PATH}`
            );
        }

        if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
            throw new Error(
                `Python script not found: ${PYTHON_SCRIPT_PATH}`
            );
        }

        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF file not found: ${pdfPath}`);
        }

        // 2. Execute Python using uv
        const { stdout, stderr } = await execFileAsync(
            UV_PATH,
            [
                "run",
                "--project",
                PYTHON_PROJECT_PATH,
                "--frozen",
                "--no-sync",
                "python",
                PYTHON_SCRIPT_PATH,
                pdfPath
            ],
            {
                cwd: PYTHON_PROJECT_PATH,
                maxBuffer: 50 * 1024 * 1024,
                windowsHide: true,
                encoding: "utf8",
                timeout: 120000
            }
        );

        // 3. Python logs
        if (stderr.trim()) {
            console.log("Python parser logs:", stderr);
        }

        // 4. Parse JSON output
        let result;

        try {
            result = JSON.parse(stdout.trim());
        } catch (parseError) {
            console.error("Invalid JSON received from Python.");
            console.error("Raw stdout:", stdout.slice(0, 2000));

            throw new Error(
                `Python parser returned invalid JSON: ${parseError.message}`
            );
        }

        // 5. Validate extraction result
        if (!result.markdown?.trim()) {
            throw new Error(
                "PDF extraction returned empty Markdown"
            );
        }

        return result;

    } catch (error) {

        console.error("PDF parsing failed:", error.message);

        if (error.stderr) {
            console.error("Python stderr:", error.stderr);
        }

        if (error.stdout) {
            console.error(
                "Python stdout:",
                error.stdout.slice(0, 2000)
            );
        }

        throw error;
    }
}
