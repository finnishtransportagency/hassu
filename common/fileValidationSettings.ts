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

// 100MB
export const maxFileSize = 100000000;

// 25MB – total attachment limit for emails sent to kirjaamo (muistutus, mielipide)
export const maxEmailAttachmentsTotalSize = 25000000;

export default { allowedFileTypesVirkamiehille, allowedFileTypesKansalaisille, maxFileSize, maxEmailAttachmentsTotalSize };
