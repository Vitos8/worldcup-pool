import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginPitch } from "./login-pitch"

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    redirect("/")
  }

  return <LoginPitch />
}
