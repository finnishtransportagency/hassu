export const allowedFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

// 25MB
export const maxFileSize = 25 * 1024 * 1024;

export default { allowedFileTypes, maxFileSize };
