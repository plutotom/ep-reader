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

export default function ExamplePage() {
  const [text, setText] = useState("");
  const helloQuery = api.post.hello.useQuery(
    { text: text || "World" },
    { enabled: false }
  );

  const handleGreeting = () => {
    if (text.trim()) {
      helloQuery.refetch();
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-card border-b p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Example Page</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>tRPC Example</CardTitle>
            <CardDescription>
              This demonstrates a simple tRPC query with input validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter your name..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGreeting()}
              />
              <Button 
                onClick={handleGreeting}
                disabled={!text.trim()}
              >
                Say Hello
              </Button>
            </div>
            
            {helloQuery.data && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  {helloQuery.data.greeting}
                </p>
              </div>
            )}

            {helloQuery.isLoading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">Loading...</p>
              </div>
            )}

            {helloQuery.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">Error: {helloQuery.error.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Features</CardTitle>
            <CardDescription>
              This template includes the following technologies and features:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">Frontend</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Next.js 14 with App Router</li>
                  <li>• React 18 with TypeScript</li>
                  <li>• Tailwind CSS for styling</li>
                  <li>• Shadcn/ui components</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Backend</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• tRPC for type-safe APIs</li>
                  <li>• Drizzle ORM for database</li>
                  <li>• PostgreSQL database</li>
                  <li>• Zod for validation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
