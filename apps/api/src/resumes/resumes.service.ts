import { Injectable } from "@nestjs/common";
import {
  getResumeForUser,
  listResumesByUser,
  uploadResume,
} from "@autoapply/resume";

@Injectable()
export class ResumesService {
  upload(
    userId: string,
    fileName: string,
    mimeType: string,
    content: Buffer,
  ) {
    return uploadResume({ userId, fileName, mimeType, content });
  }

  listForUser(userId: string) {
    return listResumesByUser(userId);
  }

  getForUser(resumeId: string, userId: string) {
    return getResumeForUser(resumeId, userId);
  }
}
