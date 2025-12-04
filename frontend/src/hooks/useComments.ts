import { useState, useCallback, useEffect } from "react";
import { api, Comment as APIComment } from "../lib/api";
import { useProject } from "./useProject";

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
  elementId?: string;
  elementName?: string;
}

/**
 * Hook for managing comments with backend integration
 * Falls back to local storage if backend is unavailable
 */
export function useComments() {
  const { projectId } = useProject();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useBackend, setUseBackend] = useState(true);

  // Load comments from backend on mount
  useEffect(() => {
    if (useBackend && projectId) {
      loadCommentsFromBackend();
    }
  }, [projectId, useBackend]);

  const loadCommentsFromBackend = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiComments = await api.comments.getAll(projectId);
      
      // Convert API comments to local format
      const localComments: Comment[] = apiComments.map((c: APIComment) => ({
        id: c.id,
        text: c.text,
        timestamp: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
        elementId: c.element_id,
        elementName: c.element_name,
      }));
      
      setComments(localComments);
    } catch (error) {
      console.warn('⚠️ Failed to load comments from backend, using local storage:', error);
      setUseBackend(false);
      // Fallback to localStorage
      const saved = localStorage.getItem(`comments-${projectId}`);
      if (saved) {
        setComments(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const addComment = useCallback(async (text: string, elementId?: string, elementName?: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      timestamp: Date.now(),
      elementId,
      elementName,
    };

    // Optimistic update
    setComments((prev) => [...prev, newComment]);

    // Save to backend if enabled
    if (useBackend && projectId) {
      try {
        const apiComment = await api.comments.create(projectId, text, elementId, elementName);
        // Update with real ID from backend
        setComments((prev) =>
          prev.map((c) => (c.id === newComment.id ? { ...c, id: apiComment.id } : c))
        );
      } catch (error) {
        console.warn('⚠️ Failed to save comment to backend:', error);
        setUseBackend(false);
      }
    }

    // Save to localStorage as fallback
    const updated = [...comments, newComment];
    localStorage.setItem(`comments-${projectId}`, JSON.stringify(updated));

    return newComment;
  }, [projectId, useBackend, comments]);

  const deleteComment = useCallback(async (commentId: string) => {
    // Optimistic update
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));

    // Delete from backend if enabled
    if (useBackend && projectId) {
      try {
        await api.comments.delete(projectId, commentId);
      } catch (error) {
        console.warn('⚠️ Failed to delete comment from backend:', error);
        setUseBackend(false);
      }
    }

    // Update localStorage
    const updated = comments.filter((c) => c.id !== commentId);
    localStorage.setItem(`comments-${projectId}`, JSON.stringify(updated));
  }, [projectId, useBackend, comments]);

  const getCommentsForElement = useCallback(
    (elementId?: string) => {
      if (!elementId) {
        return comments.filter((comment) => !comment.elementId);
      }
      return comments.filter((comment) => comment.elementId === elementId);
    },
    [comments]
  );

  const getAllComments = useCallback(() => {
    return comments;
  }, [comments]);

  const getGeneralComments = useCallback(() => {
    return comments.filter((comment) => !comment.elementId);
  }, [comments]);

  const getElementComments = useCallback(() => {
    return comments.filter((comment) => comment.elementId);
  }, [comments]);

  return {
    comments,
    addComment,
    deleteComment,
    getCommentsForElement,
    getAllComments,
    getGeneralComments,
    getElementComments,
    isLoading,
    reload: loadCommentsFromBackend,
  };
}

