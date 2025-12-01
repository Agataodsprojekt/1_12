import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Auth logic will be added when connected to backend
    console.log("Sign in attempt:", { email, password });
    // For now, redirect to viewer after sign in
    navigate("/viewer");
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <div className="w-1/3 bg-gradient-to-b from-[#4a4a4a] to-[#3a3a3a] text-white flex flex-col p-12">
        {/* Top Image */}
        <div className="bg-white rounded-lg p-4 mb-auto w-full">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F6c7345d34434437394f803917a2e5355%2Ff98026d892bf4b70a009a2399d11e81e?format=webp&width=800"
            alt="We are specialists in steel structures"
            className="w-full h-auto object-cover rounded"
          />
        </div>

        {/* Centered Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-3xl font-bold mb-6">Nasza aplikacja</h2>

          {/* Features List */}
          <ul className="space-y-3 w-full">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <span className="text-base">Przeglądarka projektu</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <span className="text-base">Odczyt plików IFC</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <span className="text-base">Kalkulator kosztów</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <span className="text-base">Weryfikacja konstrukcji</span>
            </li>
          </ul>
        </div>

        {/* Spacer */}
        <div className="mb-auto" />

        {/* Help Button */}
        <a
          href="https://www.ods-projekt.pl/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white px-4 py-3 rounded-lg transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18.485 3.515L16.485 1.515a2 2 0 00-2.828 0L1.172 14.971a2 2 0 00-.509 2.39l2.36 6.883a2 2 0 002.39.509l13.799-11.485a2 2 0 000-2.828zm-3.535 2.121L8.12 12.464l-2.12-2.121 7.83-7.828 2.12 2.121z" clipRule="evenodd" />
          </svg>
          <span>POMOC</span>
        </a>
      </div>

      {/* Right Form Section */}
      <div className="w-2/3 bg-gray-50 flex flex-col justify-center items-center p-12">
        <div className="w-full max-w-md">
          {/* ODS Logo */}
          <div className="text-center mb-12">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F6c7345d34434437394f803917a2e5355%2Fd2b953a035284f0db4174c34baa32065?format=webp&width=800"
              alt="ODS Logo"
              className="h-32 mx-auto"
            />
          </div>

          {/* Sign In Form */}
          <h1 className="text-5xl font-bold text-gray-900 mb-4 text-center">Sign in</h1>
          <p className="text-gray-600 text-center mb-8">sign in with your email</p>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-colors mt-6"
            >
              Sign in
            </button>
          </form>

          {/* Security Notice */}
          <p className="text-xs text-gray-500 text-center mt-6">
            This site is protected by reCAPTCHA and the<br />
            Google Privacy Policy
          </p>

          {/* Sign Up Link */}
          <p className="text-center mt-8 text-gray-600">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;

