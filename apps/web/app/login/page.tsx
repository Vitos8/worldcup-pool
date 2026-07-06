import { redirect } from "next/navigation"
import { LoginPitch } from "./login-pitch"
import { getSession } from "@/lib/session"

export default async function LoginPage() {
  const session = await getSession()

  if (session) {
    redirect("/")
  }

  return <LoginPitch />
}
