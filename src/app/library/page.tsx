"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { useUserId } from "~/hooks/use-user-id";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Upload, BookOpen, Clock, Trash2, Settings } from "lucide-react";
import Link from "next/link";

export default function LibraryPage() {
  const { userId, isLoading: userIdLoading } = useUserId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: books, isLoading: booksLoading, refetch } = api.book.getBooks.useQuery(
    { userId: userId || "" },
    { enabled: !!userId }
  );

  const uploadBookMutation = api.book.uploadBook.useMutation({
    onSuccess: () => {
      void refetch();
      setUploading(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      setUploading(false);
    },
  });

  const deleteBookMutation = api.book.deleteBook.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);

    try {
      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { filePath } = await uploadResponse.json();

      // Parse and save book
      await uploadBookMutation.mutateAsync({
        filePath,
        userId,
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
    }
  };

  const handleDeleteBook = (bookId: string) => {
    if (!userId) return;
    deleteBookMutation.mutate({ bookId, userId });
  };

  if (userIdLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EP-Reader</h1>
              <p className="text-sm text-gray-600">Read books in digestible chunks</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Book
            </CardTitle>
            <CardDescription>
              Upload an EPUB file to start reading in manageable chunks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".epub"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !userId}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Processing..." : "Choose EPUB File"}
              </Button>
              <p className="text-sm text-gray-600">
                Maximum file size: 50MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Books Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Books</h2>
          
          {booksLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading books...</p>
            </div>
          ) : books?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
                <p className="text-gray-600 mb-4">
                  Upload your first EPUB book to start reading in chunks
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !userId}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Book
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books?.map((book) => (
                <Card key={book.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg leading-tight mb-1">
                          {book.title}
                        </CardTitle>
                        {book.author && (
                          <CardDescription className="text-sm">
                            by {book.author}
                          </CardDescription>
                        )}
                      </div>
                      <Badge
                        variant={
                          book.status === "ready" ? "default" :
                          book.status === "active" ? "secondary" :
                          book.status === "completed" ? "outline" : "destructive"
                        }
                        className="ml-2"
                      >
                        {book.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {book.totalSections} sections
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {book.totalChapters} chapters
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <Link href={`/book/${book.id}`}>
                            View Book
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBook(book.id)}
                          disabled={deleteBookMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
