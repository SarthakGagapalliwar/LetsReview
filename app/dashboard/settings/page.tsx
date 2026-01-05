"use client";

import { ProfileForm } from "@/module/settings/components/profile-from";
import { RepositoryList } from "@/module/settings/components/repository-list";
import React from "react";

const SettingPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setting</h1>
        <p className="text-muted-foreground">
          Manage your account setting and connected repositories
        </p>
      </div>
      <ProfileForm/>
      <RepositoryList/>
    </div>
  );
};

export default SettingPage;
