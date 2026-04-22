// Contains code generated or recommended by Amazon Q
import axios, { AxiosError, AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import FormData from "form-data";
import { log } from "../../logger";

export interface SuomiFiRestClient {
  postMailboxesActive(endUsers: { id: string }[]): Promise<MailboxesActiveResponse>;
  uploadAttachment(file: Buffer, filename: string): Promise<UploadAttachmentResponse>;
  postMessage(message: MultichannelMessageRequest): Promise<MessageResponse>;
  postElectronicMessage(message: ElectronicMessageRequest): Promise<MessageResponse>;
  postPaperMailMessage(message: PaperMailOnlyMessageRequest): Promise<PaperMailResponse>;
}

export interface MailboxesActiveResponse {
  endUsersWithActiveMailbox: { id: string }[];
}

export interface UploadAttachmentResponse {
  attachmentId: string;
}

export interface MessageResponse {
  messageId: number;
}

export interface PaperMailResponse {
  messageId: number;
}

export interface ElectronicMessageRequest {
  externalId: string;
  recipient: { id: string };
  sender: { serviceId: string };
  electronic: {
    title: string;
    body: string;
    bodyFormat: "Text" | "Markdown";
    messageServiceType: "Normal" | "Verifiable";
    replyAllowedBy: "Anyone" | "No one";
    visibility: "Normal" | "Recipient only";
    attachments: { attachmentId: string }[];
    notifications: {
      senderDetailsInNotifications: "Organisation and service name" | "None";
      unreadMessageNotification: { reminder: "Default reminder" | "No reminders" };
    };
  };
}

export interface PaperMailOnlyMessageRequest {
  externalId: string;
  sender: { serviceId: string };
  paperMail: MultichannelMessageRequest["paperMail"];
}

export interface MultichannelMessageRequest {
  externalId: string;
  recipient: { id: string };
  sender: { serviceId: string };
  electronic: ElectronicMessageRequest["electronic"];
  paperMail: {
    colorPrinting: boolean;
    createAddressPage: boolean;
    rotateLandscapePages: boolean;
    twoSidedPrinting: boolean;
    messageServiceType: "Normal" | "Verifiable";
    attachments: { attachmentId: string }[];
    printingAndEnvelopingService: {
      postiMessaging: {
        username: string;
        password: string;
        contactDetails: { email: string };
      };
      costPool?: string;
    };
    recipient: {
      address: {
        name: string;
        streetAddress: string;
        zipCode: string;
        city: string;
        countryCode: string;
        additionalName?: string;
      };
    };
    sender: {
      address: {
        name: string;
        streetAddress: string;
        zipCode: string;
        city: string;
        countryCode: string;
      };
    };
  };
}

interface MessageAlreadyExistsResponse {
  messageId: number;
  reason: string;
}

function logAxiosError(context: string, error: AxiosError): void {
  log.error(`Suomi.fi REST ${context} epäonnistui`, {
    status: error.response?.status,
    traceId: error.response?.headers?.["traceid"],
    data: error.response?.data,
  });
}

function handle409AsSuccess(error: AxiosError): MessageResponse {
  const data = error.response?.data as MessageAlreadyExistsResponse | undefined;
  if (data?.messageId !== undefined) {
    log.info("Suomi.fi REST 409: viesti jo lähetetty, käsitellään onnistuneena", { messageId: data.messageId });
    const result: MessageResponse = { messageId: data.messageId };
    return result;
  }
  throw error;
}

async function postMessageWithConflictHandling(
  http: AxiosInstance,
  url: string,
  message: unknown
): Promise<MessageResponse> {
  try {
    const response = await http.post<MessageResponse>(url, message);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 409) {
      return handle409AsSuccess(error);
    }
    if (error instanceof AxiosError) {
      logAxiosError(`POST ${url}`, error);
    }
    throw error;
  }
}

export function createRestClient(endpoint: string, apiKey: string): SuomiFiRestClient {
  const http: AxiosInstance = axios.create({
    baseURL: endpoint,
    headers: {
      "x-api-key": apiKey,
    },
  });

  axiosRetry(http, {
    retries: 3,
    retryCondition: (error) => (error.response?.status ?? 0) >= 500,
    retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000,
    onRetry: (retryCount, error) => {
      log.warn(`Suomi.fi REST retry ${retryCount}/3`, { status: error.response?.status, url: error.config?.url });
    },
  });

  return {
    async postMailboxesActive(endUsers) {
      try {
        const response = await http.post<MailboxesActiveResponse>("/v1/mailboxes/active", { endUsers });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          logAxiosError("postMailboxesActive", error);
        }
        throw error;
      }
    },
    async uploadAttachment(file, filename) {
      try {
        const form = new FormData();
        form.append("file", file, { filename, contentType: "application/pdf" });
        const response = await http.post<UploadAttachmentResponse>("/v2/attachments", form, {
          headers: form.getHeaders(),
        });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          logAxiosError("uploadAttachment", error);
        }
        throw error;
      }
    },
    async postMessage(message) {
      return postMessageWithConflictHandling(http, "/v2/messages", message);
    },
    async postElectronicMessage(message) {
      return postMessageWithConflictHandling(http, "/v2/messages/electronic", message);
    },
    async postPaperMailMessage(message) {
      return postMessageWithConflictHandling(http, "/v2/paper-mail-without-id", message);
    },
  };
}
