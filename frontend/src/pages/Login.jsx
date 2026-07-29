import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/auth";
import useAuthStore from "../store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      login(response.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — editorial hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink text-paper flex-col justify-between p-14 relative overflow-hidden">
        <div>
          <span className="font-mono text-xs tracking-widest uppercase text-highlight">
            Glean
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-5xl leading-[1.1] mb-6">
            Ask your documents anything.
          </h1>
          <p className="text-paper/70 text-lg leading-relaxed">
            Upload a PDF, ask a question, get an answer grounded in the exact
            page it came from.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-paper/50">
          <div className="w-8 h-[2px] bg-highlight" />
          <span>Every answer, cited by page</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-paper">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl mb-2">Welcome back</h2>
          <p className="text-text-muted mb-8">
            Log in to continue to your documents.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper font-medium py-2.5 rounded-lg hover:bg-ink-light transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="text-sm text-text-muted mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-ink font-medium underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}