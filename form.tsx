"use client";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, type LoginState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>;
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useFormState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1">
        <span className="text-sm text-chalk-dim">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-chalk-dim">Password</span>
        <input className="input" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </label>
      {state.error && <p role="alert" className="text-sm text-chalk-pink">{state.error}</p>}
      <Submit />
    </form>
  );
}
