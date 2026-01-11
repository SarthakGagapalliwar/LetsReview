"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react"

import { getReviews } from "@/module/review/actions"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"

export default function ReviewsPage() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      return await getReviews()
    },
  })

  if (isLoading) {
    return <div>Loading reviews...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Review History</h1>
        <p className="text-muted-foreground">View all AI code reviews</p>
      </div>

      {/* Empty State */}
      {reviews?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No reviews yet. Connect a repository and open a PR.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Reviews List */
        <div className="grid gap-4">
          {reviews?.map((review: any) => (
            <Card
              key={review.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {review.prTitle}
                      </CardTitle>

                      {/* Status badges */}
                      {review.status === "completed" && (
                        <Badge className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      )}

                      {review.status === "failed" && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}

                      {review.status === "pending" && (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>

                    <CardDescription>
                      {review.repository.fullName} • PR #{review.prNumber}
                    </CardDescription>
                  </div>

                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={review.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(review.createdAt), {
                      addSuffix: true,
                    })}
                  </div>

                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-xs">
                        {review.review.substring(0, 300)}...
                      </pre>
                    </div>
                  </div>

                  <Button variant="outline" asChild>
                    <a
                      href={review.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Full Review on GitHub
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
