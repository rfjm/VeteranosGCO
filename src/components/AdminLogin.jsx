import { useState } from "react";
import { useAuth } from "../useAuth";

export default function AdminLogin({ onSuccess }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (signInError) {
      setError("Email ou palavra-passe inválidos.");
      return;
    }

    setPassword("");
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        autoComplete="username"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        className="border px-3 py-2 rounded bg-gray-600 text-white"
      />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Palavra-passe"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        className="border px-3 py-2 rounded bg-gray-600 text-white"
      />
      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "A entrar…" : "Entrar"}
      </button>
      {error && <p className="self-center text-sm text-red-300">{error}</p>}
    </form>
  );
}
