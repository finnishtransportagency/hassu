// Contains code generated or recommended by Amazon Q
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";

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

export function createRestClient(endpoint: string, apiKey: string): SuomiFiRestClient {
  const http: AxiosInstance = axios.create({
    baseURL: endpoint,
    headers: {
      "x-api-key": apiKey,
    },
  });

  return {
    async postMailboxesActive(endUsers) {
      const response = await http.post<MailboxesActiveResponse>("/v1/mailboxes/active", { endUsers });
      return response.data;
    },
    async uploadAttachment(file, filename) {
      const form = new FormData();
      form.append("file", file, { filename, contentType: "application/pdf" });
      const response = await http.post<UploadAttachmentResponse>("/v2/attachments", form, {
        headers: form.getHeaders(),
      });
      return response.data;
    },
    async postMessage(message) {
      const response = await http.post<MessageResponse>("/v2/messages", message);
      return response.data;
    },
    async postElectronicMessage(message) {
      const response = await http.post<MessageResponse>("/v2/messages/electronic", message);
      return response.data;
    },
    async postPaperMailMessage(message) {
      const response = await http.post<PaperMailResponse>("/v2/paper-mail-without-id", message);
      return response.data;
    },
  };
}
