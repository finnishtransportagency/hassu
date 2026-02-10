export const allowedFileTypesVirkamiehille = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];

export const allowedFileTypesKansalaisille = [
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

export default { allowedFileTypesVirkamiehille, allowedFileTypesKansalaisille, maxFileSize };
