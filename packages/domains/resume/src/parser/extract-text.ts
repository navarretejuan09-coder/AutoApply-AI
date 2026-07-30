import mammoth from "mammoth";
import pdfParse from "pdf-parse";

import {
  SUPPORTED_RESUME_MIME_TYPES,
  type SupportedResumeMimeType,
} from "../repository/resume.repository.js";

export function isSupportedResumeMimeType(mimeType: string): mimeType is SupportedResumeMimeType {
  return (SUPPORTED_RESUME_MIME_TYPES as readonly string[]).includes(mimeType);
}

export async function extractTextFromResume(content: Buffer, mimeType: string): Promise<string> {
  if (!isSupportedResumeMimeType(mimeType)) {
    throw new Error(`Unsupported resume MIME type: ${mimeType}`);
  }

  switch (mimeType) {
    case "application/pdf": {
      const parsed = await pdfParse(content);
      return parsed.text.trim();
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.extractRawText({ buffer: content });
      return result.value.trim();
    }
    default: {
      const exhaustive: never = mimeType;
      throw new Error(`Unsupported resume MIME type: ${exhaustive}`);
    }
  }
}
