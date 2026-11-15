import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const { mode } = await searchParams;

  return <AuthForm defaultMode={mode === "register" ? "register" : "login"} />;
}
