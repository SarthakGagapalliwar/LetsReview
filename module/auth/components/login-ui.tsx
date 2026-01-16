"use client";
import { signIn } from "@/lib/auth-client";
import { GithubIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Dither from "@/components/ui/dither";

import React from "react";

function LoginUI() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGithubLogin = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: "github",
      });
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Fullscreen Dithered Wave Background */}
      <div className="absolute inset-0">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      {/* Centered Glassmorphic Container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        {/* Glassmorphic Panel - like the navbar in reference */}
        <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left - Hero */}
            <div className="px-8 md:px-12 py-10 md:py-14 border-b lg:border-b-0 lg:border-r border-white/10">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-white/10">
                  <Image
                    src="/logoipsum.svg"
                    alt="LetsReview Logo"
                    width={28}
                    height={28}
                    className="w-7 h-7 invert"
                  />
                </div>
                <span className="text-xl font-semibold text-white tracking-tight">
                  LetsReview
                </span>
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-white/80 mb-6">
                <span className="size-1.5 rounded-full bg-white/60" />
                New Background
              </div>

              {/* Headline */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight text-white">
                Retro dithered waves to enhance your UI
              </h1>

              {/* Subtext */}
              <p className="mt-4 text-base md:text-lg text-white/60 leading-relaxed max-w-md">
                Supercharge your team to ship faster with the most advanced AI
                code reviews.
              </p>

              {/* Feature pills */}
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-white/50" />
                  AI-Powered Analysis
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-white/50" />
                  GitHub Integration
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-white/50" />
                  Real-time Feedback
                </div>
              </div>
            </div>

            {/* Right - Login */}
            <div className="px-8 md:px-12 py-10 md:py-14 flex items-center">
              <div className="w-full">
                {/* Inner glassmorphic card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                    Welcome Back
                  </h2>
                  <p className="mt-2 text-sm text-white/60">
                    Sign in to continue to your dashboard.
                  </p>

                  {/* Primary CTA - white button like reference */}
                  <button
                    onClick={handleGithubLogin}
                    disabled={isLoading}
                    className="mt-6 w-full py-3.5 px-4 bg-white text-black rounded-full font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                  >
                    <GithubIcon size={18} />
                    {isLoading ? "Signing in..." : "Get Started"}
                  </button>

                  {/* Secondary button */}
                  <button
                    disabled={isLoading}
                    className="mt-3 w-full py-3.5 px-4 bg-white/10 text-white rounded-full font-medium hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 border border-white/10"
                  >
                    Learn More
                  </button>

                  {/* Divider */}
                  <div className="my-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">
                      or
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Links */}
                  <div className="space-y-3 text-center text-sm">
                    <div className="text-white/60">
                      New to LetsReview?{" "}
                      <a
                        href="#"
                        className="text-white hover:text-white/80 font-semibold transition-colors"
                      >
                        Create an account
                      </a>
                    </div>
                    <div>
                      <a
                        href="#"
                        className="text-white/60 hover:text-white font-medium transition-colors"
                      >
                        Self-Hosted Services →
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-center gap-4 text-xs text-white/40">
                  <a href="#" className="hover:text-white/60 transition-colors">
                    Terms of Use
                  </a>
                  <span>•</span>
                  <a href="#" className="hover:text-white/60 transition-colors">
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginUI;
