"use client";
import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ExternalLink, Star, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRepositories } from "@/module/repository/hooks/use-repositories";
import { RepositoryListSkeleton } from "@/module/repository/components/repository-skeleton";
import { useConnectRepository } from "@/module/repository/hooks/use-connect-repositories";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  isConnected?: boolean;
}

const RepositoryPage = () => {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRepositories();

  const { mutate: connectRepo } = useConnectRepository();

  const [localConnectingId, setLocalConnectingId] = useState<number | null>(
    null
  );
  const observerTarget = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
      }
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allRepositories = data?.pages.flatMap((page) => page) || [];

  const filteredRepositories = allRepositories.filter(
    (repo: Repository) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = (repo: Repository) => {
    // TODO: wire up actual connect action
    setLocalConnectingId(repo.id);
    connectRepo(
      {
        owner: repo.full_name.split("/")[0],
        repo: repo.name,
        githubId: repo.id,
      },
      {
        onSettled: () => setLocalConnectingId(null),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="text-muted-foreground">
            Manage and view all your GitHub repositories
          </p>
        </div>
        <RepositoryListSkeleton />
      </div>
    );
  }
  if (isError) {
    return <div>Failed to load repositories.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground">
          Manage and view all your GitHub repositories
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid gap-4">
        {filteredRepositories.map((repo: Repository) => (
          <Card key={repo.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{repo.name}</CardTitle>
                    <Badge variant="outline">
                      {repo.language || "Unknown"}
                    </Badge>
                    {repo.isConnected && (
                      <Badge variant="secondary">Connected</Badge>
                    )}
                  </div>
                  <CardDescription>{repo.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    onClick={() => handleConnect(repo)}
                    disabled={localConnectingId === repo.id || repo.isConnected}
                    variant={repo.isConnected ? "outline" : "default"}
                  >
                    {localConnectingId === repo.id
                      ? "Connecting..."
                      : repo.isConnected
                      ? "Connected"
                      : "Connect"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span>
                    {repo.stargazers_count?.toLocaleString?.() ??
                      repo.stargazers_count}
                  </span>
                </Badge>
                {repo.topics?.slice(0, 3).map((topic) => (
                  <Badge key={topic} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div ref={observerTarget} className="py-4">
        {isFetchingNextPage && <RepositoryListSkeleton />}
        {!hasNextPage && allRepositories.length > 0 && (
          <p className="text-center text-muted-foreground">
            No More Repositories
          </p>
        )}
      </div>
    </div>
  );
};

export default RepositoryPage;
