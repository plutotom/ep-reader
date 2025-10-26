"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import Link from "next/link";

export default function HomePage() {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const utils = api.useUtils();
  
  const { data: posts, isLoading, error } = api.post.getAll.useQuery();
  
  const createPost = api.post.create.useMutation({
    onSuccess: () => {
      void utils.post.getAll.invalidate();
      setName("");
      setContent("");
    },
  });

  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      void utils.post.getAll.invalidate();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await createPost.mutateAsync({
      name: name.trim(),
      content: content.trim() || undefined,
    });
  };

  const handleDelete = (id: string) => {
    deletePost.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading posts...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">Error: {error.message}</div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-card border-b p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Template App</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">Built with Next.js, tRPC, and Drizzle</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/example">Example</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/components">Components</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {/* Create Post Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
            <CardDescription>
              Add a new post to demonstrate the template functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Post title..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  placeholder="Post content (optional)..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                disabled={createPost.isPending || !name.trim()}
              >
                {createPost.isPending ? "Creating..." : "Create Post"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Posts List */}
        <Card>
          <CardHeader>
            <CardTitle>Posts</CardTitle>
            <CardDescription>
              {posts?.length === 0 
                ? "No posts yet. Create your first post above!" 
                : `${posts?.length} post${posts?.length === 1 ? '' : 's'} total`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {posts?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No posts to display
              </div>
            ) : (
              <div className="space-y-4">
                {posts?.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{post.name}</h3>
                      {post.content && (
                        <p className="text-sm text-gray-600 mt-1">
                          {post.content}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      disabled={deletePost.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}