"use client";
import { signIn } from "@/lib/auth-client";
import { GithubIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Left Section - Hero Content */}
      <div className="flex-1 flex flex-col justify-center px-12 py-16">
        <div className="max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 text-2xl font-bold">
              <Image
                src="/logoipsum.svg"
                alt="LetsReview Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span>LetsReview</span>
            </div>
          </div>

          {/* Main Content */}
          <h1 className="text-5xl font-bold mb-6 leading-tight text-balance">
            Cut Code Review Time & Bugs in Half.{" "}
            <span className="block">Instantly.</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed">
            Supercharge your team to ship faster with the most advanced AI code
            reviews.
          </p>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-12 py-16 bg-muted/20">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">
              Login using the following providers:
            </p>
          </div>

          {/* GitHub Login Button */}
          <button
            onClick={handleGithubLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-foreground text-background rounded-lg font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 mb-8"
          >
            <GithubIcon size={20} />
            {isLoading ? "Signing in..." : "GitHub"}
          </button>

          {/* Footer Links */}
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            <div>
              New to LetsReview?{" "}
              <a
                href="#"
                className="text-primary hover:text-primary/80 font-semibold"
              >
                Sign Up
              </a>
            </div>
            <div>
              <a
                href="#"
                className="text-primary hover:text-primary/80 font-semibold"
              >
                Self-Hosted Services
              </a>
            </div>
          </div>

          {/* Bottom Links */}
          <div className="mt-12 pt-8 border-t border-border flex justify-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">
              Terms of Use
            </a>
            <span>and</span>
            <a href="#" className="hover:text-foreground">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginUI;
