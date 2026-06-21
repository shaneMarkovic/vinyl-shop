import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await props.searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/admin/login?error=1");
      }
      throw err; // re-throw Next.js redirect control-flow
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 bg-white p-6"
      >
        <h1 className="text-lg font-bold text-neutral-900">Admin sign in</h1>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Invalid email or password.
          </p>
        )}
        <label className="block text-sm">
          <span className="text-neutral-700">Email</span>
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-md border border-black/20 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-700">Password</span>
          <input
            type="password"
            name="password"
            required
            className="mt-1 w-full rounded-md border border-black/20 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
