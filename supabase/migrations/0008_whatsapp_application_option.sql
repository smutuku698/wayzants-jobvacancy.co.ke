-- Optional WhatsApp number employers can add alongside their required
-- application method (email/link), so applicants have an extra way to send
-- a CV/cover letter directly.

alter table jobs
  add column whatsapp_number text;
