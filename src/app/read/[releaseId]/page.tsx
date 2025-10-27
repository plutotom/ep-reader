"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useUserId } from "~/hooks/use-user-id";
import { useProgressTracking } from "~/hooks/use-progress-tracking";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  BookOpen,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

interface ReadingPageProps {
  params: Promise<{
    releaseId: string;
  }>;
}

export default function ReadingPage({ params }: ReadingPageProps) {
  // Wait for params to be resolved (Next.js 15 async params)
  const [releaseId, setReleaseId] = useState<string>("");
  const [isParamsReady, setIsParamsReady] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setReleaseId(resolvedParams.releaseId);
      setIsParamsReady(true);
    });
  }, [params]);
  const { userId, isLoading: userIdLoading } = useUserId();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Get release data
  const { data: releases } = api.schedule.getAvailableReleases.useQuery(
    { userId: userId || "" },
    { enabled: !!userId }
  );

  const currentRelease = releases?.find(r => r.id === releaseId);

  // Get sections for current release
  const { data: sections, isLoading: sectionsLoading } = api.book.getBook.useQuery(
    { bookId: currentRelease?.bookId || "", userId: userId || "" },
    { enabled: !!currentRelease?.bookId && !!userId }
  );

  const releaseSections = currentRelease ? 
    sections?.sections.filter(s => currentRelease.sectionIds.includes(s.id)) || [] : [];

  const currentSection = releaseSections[currentSectionIndex];

  // Get progress for current section
  const { data: sectionWithProgress } = api.progress.getSectionWithProgress.useQuery(
    { userId: userId || "", sectionId: currentSection?.id || "" },
    { enabled: !!currentSection?.id && !!userId }
  );

  const markSectionReadMutation = api.progress.markSectionRead.useMutation({
    onSuccess: () => {
      // Move to next section or mark release as read
      if (currentSectionIndex < releaseSections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
      } else {
        // All sections read, mark release as read
        markReleaseReadMutation.mutate({
          releaseId,
          userId: userId || "",
        });
      }
    },
  });

  const markReleaseReadMutation = api.schedule.markReleaseRead.useMutation({
    onSuccess: () => {
      // Redirect to library or next release
      window.location.href = "/library";
    },
  });

  // Progress tracking
  const { scrollToLastParagraph } = useProgressTracking({
    userId: userId || "",
    sectionId: currentSection?.id || "",
    releaseId,
    content: currentSection?.content || "",
  });

  // Scroll to last read paragraph when section loads
  useEffect(() => {
    if (sectionWithProgress?.progress && sectionWithProgress.progress.lastParagraphIndex > 0) {
      setTimeout(() => {
        scrollToLastParagraph(sectionWithProgress.progress.lastParagraphIndex);
      }, 500);
    }
  }, [currentSection?.id, sectionWithProgress?.progress, scrollToLastParagraph]);

  const handleMarkAsRead = () => {
    if (!currentSection || !userId) return;
    
    markSectionReadMutation.mutate({
      userId,
      sectionId: currentSection.id,
      releaseId,
    });
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < releaseSections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  if (userIdLoading || sectionsLoading || !isParamsReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentRelease || !currentSection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Release not found</h3>
            <p className="text-gray-600 mb-4">
              This release doesn't exist or you don't have access to it.
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/library">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Library
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {sections?.title}
                </h1>
                <p className="text-sm text-gray-600">
                  Section {currentSectionIndex + 1} of {releaseSections.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {currentSection.estimatedReadTime} min
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round((currentSectionIndex + 1) / releaseSections.length * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentSectionIndex + 1) / releaseSections.length * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentSection.title}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{currentSection.wordCount} words</span>
            <span>{currentSection.estimatedReadTime} minutes</span>
            <Badge variant="outline">H{currentSection.headerLevel}</Badge>
          </div>
        </div>

        {/* Section Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div 
              data-content-container
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: currentSection.content }}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousSection}
            disabled={currentSectionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {currentSectionIndex + 1} of {releaseSections.length}
            </span>
          </div>

          {currentSectionIndex < releaseSections.length - 1 ? (
            <Button onClick={handleNextSection}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleMarkAsRead}
              disabled={markSectionReadMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Read
            </Button>
          )}
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {currentSectionIndex + 1} of {releaseSections.length} sections
            </div>
            <div className="flex items-center gap-2">
              {currentSectionIndex < releaseSections.length - 1 ? (
                <Button
                  size="sm"
                  onClick={handleNextSection}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next Section
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={markSectionReadMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finish Reading
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
