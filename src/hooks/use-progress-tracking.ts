"use client";

import { useEffect, useRef, useCallback } from "react";
import { api } from "~/trpc/react";

interface UseProgressTrackingProps {
  userId: string;
  sectionId: string;
  releaseId?: string;
  content: string;
}

export function useProgressTracking({ userId, sectionId, releaseId, content }: UseProgressTrackingProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const updateProgressMutation = api.progress.updateProgress.useMutation();

  // Debounced progress update
  const updateProgress = useCallback((paragraphIndex: number) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 3000) return; // Debounce 3 seconds
    
    lastUpdateRef.current = now;
    
    const percentage = Math.min((paragraphIndex / getTotalParagraphs()) * 100, 100);
    
    updateProgressMutation.mutate({
      userId,
      sectionId,
      releaseId,
      progressPercentage: percentage,
      lastParagraphIndex: paragraphIndex,
    });
  }, [userId, sectionId, releaseId, updateProgressMutation]);

  // Count total paragraphs in content
  const getTotalParagraphs = useCallback(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    return doc.querySelectorAll('p').length;
  }, [content]);

  // Set up paragraph tracking
  useEffect(() => {
    if (!content) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const paragraphIndex = parseInt(entry.target.getAttribute('data-paragraph-index') || '0');
            updateProgress(paragraphIndex);
          }
        });
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px', // Trigger when paragraph is 20% visible
        threshold: 0.1,
      }
    );

    // Add data attributes to paragraphs and observe them
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const paragraphs = doc.querySelectorAll('p');
    
    paragraphs.forEach((p, index) => {
      p.setAttribute('data-paragraph-index', index.toString());
    });

    // Update the content with paragraph indices
    const updatedContent = doc.body.innerHTML;
    
    // Find the content container and update it
    const contentContainer = document.querySelector('[data-content-container]');
    if (contentContainer) {
      contentContainer.innerHTML = updatedContent;
      
      // Observe all paragraphs
      const updatedParagraphs = contentContainer.querySelectorAll('p[data-paragraph-index]');
      updatedParagraphs.forEach((p) => {
        observerRef.current?.observe(p);
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [content, updateProgress]);

  // Scroll to last read paragraph on mount
  const scrollToLastParagraph = useCallback((lastParagraphIndex: number) => {
    const paragraph = document.querySelector(`[data-paragraph-index="${lastParagraphIndex}"]`);
    if (paragraph) {
      paragraph.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    scrollToLastParagraph,
    isUpdating: updateProgressMutation.isPending,
  };
}
