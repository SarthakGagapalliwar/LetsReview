import LoginUI from "@/module/auth/components/login-ui";
import { requiredUnAuth } from "@/module/auth/utils/auth-utils";
import React from "react";

export const dynamic = "force-dynamic";

const LoginPage = async () => {
  await requiredUnAuth();
  return (
    <div>
      <LoginUI />
    </div>
  );
};

export default LoginPage;
