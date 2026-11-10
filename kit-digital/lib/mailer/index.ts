// Interfaz de correo. Sin proveedor configurado, los mensajes se escriben en la consola del servidor.
// Para producción, implementar un driver (SMTP, Resend, SES…) y seleccionarlo aquí.
export type MailMessage = { to: string; subject: string; text: string };

export async function sendMail(msg: MailMessage): Promise<void> {
  if (process.env.MAIL_DRIVER && process.env.MAIL_DRIVER !== "console") {
    throw new Error(`MAIL_DRIVER "${process.env.MAIL_DRIVER}" no está implementado.`);
  }
  console.info(`[mailer] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
}
