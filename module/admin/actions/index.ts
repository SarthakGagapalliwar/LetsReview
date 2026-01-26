"use server";

import prisma from "@/lib/db";
import { requireAdmin } from "@/module/auth/utils/auth-utils";

// ============ Platform Statistics ============

export interface PlatformStats {
  totalUsers: number;
  totalRepositories: number;
  totalReviews: number;
  totalFullReviews: number;
  proUsers: number;
  freeUsers: number;
  starredUsers: number;
  usersThisMonth: number;
  reviewsThisMonth: number;
}

export async function getAdminStats(): Promise<PlatformStats> {
  await requireAdmin();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    totalRepositories,
    totalReviews,
    totalFullReviews,
    proUsers,
    starredUsers,
    usersThisMonth,
    reviewsThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.repository.count(),
    prisma.review.count(),
    prisma.repositoryReview.count(),
    prisma.user.count({ where: { subscriptionTier: "PRO" } }),
    prisma.user.count({ where: { starredRepo: true } }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.review.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  return {
    totalUsers,
    totalRepositories,
    totalReviews,
    totalFullReviews,
    proUsers,
    freeUsers: totalUsers - proUsers,
    starredUsers,
    usersThisMonth,
    reviewsThisMonth,
  };
}

// ============ User Analytics ============

export interface UserWithStats {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  subscriptionTier: string;
  starredRepo: boolean;
  createdAt: Date;
  _count: {
    repositories: number;
  };
  reviewCount: number;
  fullReviewCount: number;
}

export interface PaginatedUsers {
  users: UserWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAllUsers(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
): Promise<PaginatedUsers> {
  await requireAdmin();

  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        subscriptionTier: true,
        starredRepo: true,
        createdAt: true,
        _count: {
          select: {
            repositories: true,
          },
        },
        repositories: {
          select: {
            _count: {
              select: {
                reviews: true,
                repositoryReviews: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const usersWithStats: UserWithStats[] = users.map(
    (user: (typeof users)[number]) => {
      const reviewCount = user.repositories.reduce(
        (acc: number, repo: (typeof user.repositories)[number]) =>
          acc + repo._count.reviews,
        0,
      );
      const fullReviewCount = user.repositories.reduce(
        (acc: number, repo: (typeof user.repositories)[number]) =>
          acc + repo._count.repositoryReviews,
        0,
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        starredRepo: user.starredRepo,
        createdAt: user.createdAt,
        _count: user._count,
        reviewCount,
        fullReviewCount,
      };
    },
  );

  return {
    users: usersWithStats,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============ Single User Details ============

export interface UserDetails {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string | null;
  starredRepo: boolean;
  starCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  repositories: {
    id: string;
    name: string;
    fullName: string;
    url: string;
    indexStatus: string;
    createdAt: Date;
    _count: {
      reviews: number;
      repositoryReviews: number;
    };
  }[];
  recentReviews: {
    id: string;
    prNumber: number;
    prTitle: string;
    prUrl: string;
    status: string;
    createdAt: Date;
    repository: {
      name: string;
      fullName: string;
    };
  }[];
  recentFullReviews: {
    id: string;
    status: string;
    createdAt: Date;
    repository: {
      name: string;
      fullName: string;
    };
  }[];
  usage: {
    repositoryCount: number;
  } | null;
}

export async function getUserDetails(
  userId: string,
): Promise<UserDetails | null> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      repositories: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          fullName: true,
          url: true,
          indexStatus: true,
          createdAt: true,
          _count: {
            select: {
              reviews: true,
              repositoryReviews: true,
            },
          },
        },
      },
      usuage: {
        select: {
          repositoryCount: true,
        },
      },
    },
  });

  if (!user) return null;

  // Get recent reviews across all user's repositories
  const recentReviews = await prisma.review.findMany({
    where: {
      repository: {
        userId: userId,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      prNumber: true,
      prTitle: true,
      prUrl: true,
      status: true,
      createdAt: true,
      repository: {
        select: {
          name: true,
          fullName: true,
        },
      },
    },
  });

  // Get recent full reviews
  const recentFullReviews = await prisma.repositoryReview.findMany({
    where: {
      repository: {
        userId: userId,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      repository: {
        select: {
          name: true,
          fullName: true,
        },
      },
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    starredRepo: user.starredRepo,
    starCheckedAt: user.starCheckedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    repositories: user.repositories,
    recentReviews,
    recentFullReviews,
    usage: user.usuage,
  };
}

// ============ Review Analytics ============

export interface ReviewTrend {
  date: string;
  reviews: number;
  fullReviews: number;
}

export async function getReviewTrends(
  days: number = 30,
): Promise<ReviewTrend[]> {
  await requireAdmin();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const [reviews, fullReviews] = await Promise.all([
    prisma.review.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
    prisma.repositoryReview.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
  ]);

  // Group by date
  const trendMap = new Map<string, { reviews: number; fullReviews: number }>();

  // Initialize all dates
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    trendMap.set(dateStr, { reviews: 0, fullReviews: 0 });
  }

  // Count reviews per day
  reviews.forEach((r: { createdAt: Date }) => {
    const dateStr = r.createdAt.toISOString().split("T")[0];
    const existing = trendMap.get(dateStr);
    if (existing) {
      existing.reviews++;
    }
  });

  fullReviews.forEach((r: { createdAt: Date }) => {
    const dateStr = r.createdAt.toISOString().split("T")[0];
    const existing = trendMap.get(dateStr);
    if (existing) {
      existing.fullReviews++;
    }
  });

  return Array.from(trendMap.entries())
    .map(([date, counts]) => ({
      date,
      reviews: counts.reviews,
      fullReviews: counts.fullReviews,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============ User Growth Analytics ============

export interface UserGrowthTrend {
  date: string;
  users: number;
  cumulative: number;
}

export async function getUserGrowthTrends(
  days: number = 30,
): Promise<UserGrowthTrend[]> {
  await requireAdmin();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const usersBeforeStart = await prisma.user.count({
    where: { createdAt: { lt: startDate } },
  });

  // Group by date
  const trendMap = new Map<string, number>();

  // Initialize all dates
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    trendMap.set(dateStr, 0);
  }

  // Count users per day
  users.forEach((u: { createdAt: Date }) => {
    const dateStr = u.createdAt.toISOString().split("T")[0];
    const existing = trendMap.get(dateStr);
    if (existing !== undefined) {
      trendMap.set(dateStr, existing + 1);
    }
  });

  let cumulative = usersBeforeStart;
  return Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => {
      cumulative += count;
      return {
        date,
        users: count,
        cumulative,
      };
    });
}

// ============ Subscription Breakdown ============

export interface SubscriptionBreakdown {
  tier: string;
  count: number;
  percentage: number;
}

export async function getSubscriptionBreakdown(): Promise<
  SubscriptionBreakdown[]
> {
  await requireAdmin();

  const [freeCount, proCount] = await Promise.all([
    prisma.user.count({ where: { subscriptionTier: "FREE" } }),
    prisma.user.count({ where: { subscriptionTier: "PRO" } }),
  ]);

  const total = freeCount + proCount;

  return [
    {
      tier: "FREE",
      count: freeCount,
      percentage: total > 0 ? Math.round((freeCount / total) * 100) : 0,
    },
    {
      tier: "PRO",
      count: proCount,
      percentage: total > 0 ? Math.round((proCount / total) * 100) : 0,
    },
  ];
}

// ============ Review Status Breakdown ============

export interface ReviewStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export async function getReviewStatusBreakdown(): Promise<
  ReviewStatusBreakdown[]
> {
  await requireAdmin();

  const statuses = ["completed", "pending", "failed"];
  const counts = await Promise.all(
    statuses.map((status) => prisma.review.count({ where: { status } })),
  );

  const total = counts.reduce((a: number, b: number) => a + b, 0);

  return statuses.map((status, i) => ({
    status,
    count: counts[i],
    percentage: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
  }));
}

// ============ Repository Index Status ============

export interface RepoIndexStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export async function getRepoIndexStatusBreakdown(): Promise<
  RepoIndexStatusBreakdown[]
> {
  await requireAdmin();

  const statuses = ["pending", "indexing", "indexed", "failed"];
  const counts = await Promise.all(
    statuses.map((status) =>
      prisma.repository.count({ where: { indexStatus: status } }),
    ),
  );

  const total = counts.reduce((a: number, b: number) => a + b, 0);

  return statuses.map((status, i) => ({
    status,
    count: counts[i],
    percentage: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
  }));
}

// ============ Top Users by Activity ============

export interface TopUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  subscriptionTier: string;
  repositoryCount: number;
  reviewCount: number;
  fullReviewCount: number;
}

export async function getTopUsersByActivity(
  limit: number = 10,
): Promise<TopUser[]> {
  await requireAdmin();

  const users = await prisma.user.findMany({
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      subscriptionTier: true,
      _count: {
        select: {
          repositories: true,
        },
      },
      repositories: {
        select: {
          _count: {
            select: {
              reviews: true,
              repositoryReviews: true,
            },
          },
        },
      },
    },
  });

  type UserWithRepos = (typeof users)[number];
  type RepoWithCount = UserWithRepos["repositories"][number];

  const usersWithActivity = users.map((user: UserWithRepos) => {
    const reviewCount = user.repositories.reduce(
      (acc: number, repo: RepoWithCount) => acc + repo._count.reviews,
      0,
    );
    const fullReviewCount = user.repositories.reduce(
      (acc: number, repo: RepoWithCount) => acc + repo._count.repositoryReviews,
      0,
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      subscriptionTier: user.subscriptionTier,
      repositoryCount: user._count.repositories,
      reviewCount,
      fullReviewCount,
      totalActivity: reviewCount + fullReviewCount,
    };
  });

  type UserWithActivity = (typeof usersWithActivity)[number];

  return (
    usersWithActivity
      .sort(
        (a: UserWithActivity, b: UserWithActivity) =>
          b.totalActivity - a.totalActivity,
      )
      .slice(0, limit)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ totalActivity, ...rest }: UserWithActivity) => rest)
  );
}

// ============ Check if user is admin (for client components) ============

export async function checkIsAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}
