"use client";

import { FormEvent } from "react";

export function formatBrazilPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd}) ${number}`;
  const split = number.length > 8 ? 5 : 4;
  return `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`;
}

export function WhatsAppField({ defaultValue = "", required = true, label = "Telefone / WhatsApp" }: { defaultValue?: string; required?: boolean; label?: string }) {
  function formatInput(event: FormEvent<HTMLInputElement>) { event.currentTarget.value = formatBrazilPhone(event.currentTarget.value); }
  return <label>{label}<span className="whatsapp-input"><span className="whatsapp-icon" aria-hidden="true">☎</span><input name="phone" required={required} inputMode="tel" autoComplete="tel" maxLength={15} defaultValue={formatBrazilPhone(defaultValue)} placeholder="(00) 00000-0000" onInput={formatInput} /></span></label>;
}
