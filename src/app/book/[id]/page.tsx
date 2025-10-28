"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useUserId } from "~/hooks/use-user-id";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { 
  ArrowLeft, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  BookOpen, 
  Clock,
  Calendar,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

interface BookDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function BookDetailPage({ params }: BookDetailPageProps) {
  const { userId, isLoading: userIdLoading } = useUserId();
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [bookId, setBookId] = useState<string>("");
  const [isParamsReady, setIsParamsReady] = useState(false);

  // Wait for params to be resolved (Next.js 15 async params)
  useEffect(() => {
    params.then((resolvedParams) => {
      setBookId(resolvedParams.id);
      setIsParamsReady(true);
    });
  }, [params]);

  const { data: book, isLoading: bookLoading } = api.book.getBook.useQuery(
    { bookId, userId: userId || "" },
    { enabled: !!userId && !!bookId }
  );

  const { data: schedule } = api.schedule.getSchedule.useQuery(
    { bookId },
    { enabled: !!bookId }
  );

  // Get user's available releases and pick the latest for this book
  const { data: availableReleases } = api.schedule.getAvailableReleases.useQuery(
    { userId: userId || "" },
    { enabled: !!userId }
  );

  const latestBookRelease = availableReleases?.find(r => r.bookId === bookId);

  const { data: progress } = api.progress.getBookProgress.useQuery(
    { userId: userId || "", bookId },
    { enabled: !!userId && !!bookId }
  );

  const deleteBookMutation = api.book.deleteBook.useMutation({
    onSuccess: () => {
      // Redirect to library
      window.location.href = "/library";
    },
  });

  const handleDeleteBook = () => {
    if (!userId) return;
    if (confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
      deleteBookMutation.mutate({ bookId, userId });
    }
  };

  const handleStartReading = () => {
    if (!latestBookRelease) return;
    window.location.href = `/read/${latestBookRelease.id}`;
  };

  if (userIdLoading || bookLoading || !isParamsReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Book not found</h3>
            <p className="text-gray-600 mb-4">
              The book you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button asChild>
              <Link href="/library">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/library">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{book.title}</h1>
                {book.author && (
                  <p className="text-sm text-gray-600">by {book.author}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  book.status === "ready" ? "default" :
                  book.status === "active" ? "secondary" :
                  book.status === "completed" ? "outline" : "destructive"
                }
              >
                {book.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Book Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Book Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Book Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{book.totalSections}</div>
                    <div className="text-sm text-gray-600">Sections</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{book.totalChapters}</div>
                    <div className="text-sm text-gray-600">Chapters</div>
                  </div>
                </div>
                
                {progress && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(progress.progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.progressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{progress.readSections} of {progress.totalSections} sections read</span>
                        <span>{progress.estimatedTimeRemaining} min remaining</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sections List */}
            <Card>
              <CardHeader>
                <CardTitle>Sections</CardTitle>
                <CardDescription>
                  {book.sections.length} sections organized by chapters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {book.sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {section.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            H{section.headerLevel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span>{section.wordCount} words</span>
                          <span>{section.estimatedReadTime} min read</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {progress?.readSections && index < progress.readSections ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Schedule Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Release Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedule ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Type: {schedule.scheduleType}</div>
                      <div>Time: {schedule.releaseTime}</div>
                      <div>Sections: {schedule.sectionsPerRelease}</div>
                      <div>Days: {schedule.daysOfWeek.map(d => {
                        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        return days[d - 1];
                      }).join(', ')}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/book/${book.id}/schedule`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Schedule
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      No schedule set up yet
                    </p>
                    <Button
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/book/${book.id}/schedule`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Set Up Schedule
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={handleStartReading}
                  disabled={!(book.status === "ready" || book.status === "active") || !latestBookRelease}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Reading
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowScheduleForm(!showScheduleForm)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {schedule ? "Edit Schedule" : "Set Schedule"}
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteBook}
                  disabled={deleteBookMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Book
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
