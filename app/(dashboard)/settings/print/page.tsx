import { redirect } from "next/navigation";

export default function PrintSettingsRedirectPage() {
  redirect("/settings/printouts");
}
