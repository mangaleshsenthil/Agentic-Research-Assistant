import axios from 'axios';

export const API_BASE_URL = "http://localhost:8000";

/**
 * Upload a PDF and get headings + full summary + research ideas.
 * Both agents run in parallel on the backend.
 */
export const uploadPaper = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min timeout for large papers
    });
    return response.data;
};

/**
 * Get a detailed summary for a specific section heading.
 */
export const summarizeSection = async (paperId, heading) => {
    const response = await axios.post(`${API_BASE_URL}/summarize-section`, {
        paper_id: paperId,
        heading: heading,
    });
    return response.data;
};

/**
 * Generate a research workflow for a selected idea or model.
 */
export const generateWorkflow = async (paperId, selectedItem, generateImage = false) => {
    const response = await axios.post(`${API_BASE_URL}/generate-workflow`, {
        paper_id: paperId,
        selected_item: selectedItem,
        generate_image: generateImage,
    });
    return response.data;
};

/**
 * Open the download link for the generated workflow Word doc.
 */
export const downloadWorkflowFile = (workflowId) => {
    window.open(`${API_BASE_URL}/download-workflow/${workflowId}`, '_blank');
};
