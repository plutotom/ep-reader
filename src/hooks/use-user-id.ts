"use client";

import { useState, useEffect } from "react";

const USER_ID_KEY = "ep-reader-user-id";

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get or create user ID
    let storedUserId = localStorage.getItem(USER_ID_KEY);
    
    if (!storedUserId) {
      // Generate new UUID
      storedUserId = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, storedUserId);
    }
    
    setUserId(storedUserId);
    setIsLoading(false);
  }, []);

  return { userId, isLoading };
}


