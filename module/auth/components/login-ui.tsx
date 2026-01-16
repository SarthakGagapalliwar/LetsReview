"use client";
import { signIn } from "@/lib/auth-client";
import { GithubIcon, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import React from "react";
import Dither from "@/components/ui/dither";
import OkiroAscii from "@/components/okiro";
import AsciiHero from "@/components/okiro";

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
      {/* Dither background effect */}
      <div
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      >
        <Dither colorNum={40} />
      </div>

      {/* Centered container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 sm:p-8 md:p-12 lg:p-16 animate-fade-in">
        {/* Main card - enhanced glassmorphism */}
        <div className="w-full max-w-7xl backdrop-blur-sm bg-black/20 border border-white/10 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left - Hero section with layered blur */}
            <div className="p-10 sm:p-12 md:p-14 lg:p-16 border-b lg:border-b-0 lg:border-r border-white/10 backdrop-blur-xl">
              {/* Header - enhanced blur */}
              <div className="flex items-center gap-3 mb-12">
                <div className="p-3 bg-white/10 backdrop-blur-md border border-white/10">
                  <Image
                    src="/logoipsum.svg"
                    alt="LetsReview Logo"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-xl font-medium text-white tracking-tight">
                  LetsReview
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium leading-[1.1] tracking-tight text-white animate-fade-in">
                Ship faster with
                <br />
                <span className="text-white/50">AI code reviews</span>
              </h1>

              {/* Subtext */}
              <p className="mt-6 text-base sm:text-lg text-white/60 leading-relaxed max-w-md animate-fade-in stagger-1">
                Supercharge your team to ship faster with the most advanced
                AI-powered code reviews for your GitHub repositories.
              </p>

              {/* Feature pills with glass background */}
              <div className="mt-10 flex items-center gap-3 text-xs text-white/50 animate-fade-in stagger-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-sm whitespace-nowrap">
                  <div className="size-1.5 bg-white/30" />
                  AI-Powered Analysis
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-sm whitespace-nowrap">
                  <div className="size-1.5 bg-white/30" />
                  GitHub Integration
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-sm whitespace-nowrap">
                  <div className="size-1.5 bg-white/30" />
                  Real-time Feedback
                </div>
              </div>
            </div>

            {/* Right - Login section with layered blur */}
            <div className="p-10 sm:p-12 md:p-14 lg:p-16 flex flex-col relative h-full backdrop-blur-xl">
              {/* Top Right Badge - enhanced blur */}

              {/* Centered Form */}
                <div className="absolute top-0 right-0 p-10 sm:p-12 md:p-14 lg:p-16 pointer-events-none">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/70 uppercase tracking-wider shadow-lg">
                  <span className="size-2 bg-emerald-400 animate-pulse" />
                  Now Available
                </div>
              </div>
              <div className="w-full max-w-sm mx-auto space-y-8 my-auto animate-fade-in stagger-3">
                {/* Header */}
                <div className="space-y-2 text-center">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Welcome back
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Sign in to your account to continue
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <button
                    onClick={handleGithubLogin}
                    disabled={isLoading}
                    className="group w-full h-11 px-4 bg-white/90 text-black text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 rounded-sm backdrop-blur-sm"
                  >
                    <GithubIcon size={16} strokeWidth={2} />
                    {isLoading ? "Connecting..." : "Continue with GitHub"}
                    <ArrowRight
                      size={14}
                      className="ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                    />
                  </button>
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
