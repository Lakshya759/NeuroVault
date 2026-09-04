import { asyncHandler } from "../../utils/asyncHandler.js";
import { pdfQueue } from "../../queues/pdf.queue.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
const getPDFStatus = asyncHandler(async (req, res) => {

    const { jobId } = req.params;

    const job = await pdfQueue.getJob(jobId);

    if (!job) {
        throw new ApiError(
            404,
            "PDF processing job not found"
        );
    }

    const state = await job.getState();

    let result = null;
    let error = null;

    if (state === "completed") {
        result = job.returnvalue;
    }

    if (state === "failed") {
        error = job.failedReason;
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                jobId: job.id,
                state,
                progress: job.progress,
                result,
                error
            },
            "PDF processing status fetched"
        )
    );
});

export {getPDFStatus}