import { wabaClient } from "@/lib/whatsapp/waba-client";
import { formatPhoneNumber } from "@/utils/formatting";

export class WabaService {
  /**
   * Sends an automated appointment confirmation message template via WhatsApp Cloud API
   */
  static async sendAppointmentConfirmation(input: {
    phone: string;
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    timeSlot: string;
    tokenNumber: number;
    hospitalName: string;
  }) {
    const { e164 } = formatPhoneNumber(input.phone);

    return await wabaClient.sendTemplateMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: e164,
      type: "template",
      template: {
        name: "appointment_confirmation_v1",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: input.patientName },
              { type: "text", text: input.doctorName },
              { type: "text", text: `${input.appointmentDate} at ${input.timeSlot}` },
              { type: "text", text: String(input.tokenNumber) },
              { type: "text", text: input.hospitalName },
            ],
          },
        ],
      },
    });
  }

  /**
   * Dispatches digital prescription download PDF link to the patient
   */
  static async sendPrescriptionReady(input: {
    phone: string;
    patientName: string;
    consultationNumber: string;
    doctorName: string;
    pdfDownloadUrl: string;
  }) {
    const { e164 } = formatPhoneNumber(input.phone);

    return await wabaClient.sendTemplateMessage({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: e164,
      type: "template",
      template: {
        name: "prescription_ready_v1",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: input.patientName },
              { type: "text", text: input.consultationNumber },
              { type: "text", text: input.doctorName },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [{ type: "text", text: input.pdfDownloadUrl }],
          },
        ],
      },
    });
  }
}
