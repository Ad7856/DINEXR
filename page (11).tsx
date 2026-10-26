import { LoginForm } from "./form";

export const metadata = { title: "Staff sign in" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-chalk text-5xl text-bloom">DINEXR</h1>
        <p className="text-chalk-dim">Staff sign in</p>
      </div>
      <LoginForm next={searchParams.next ?? ""} />
    </main>
  );
}
