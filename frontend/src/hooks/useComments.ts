import { useState, useCallback } from "react";

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
  elementId?: string; // ID elementu IFC (jeśli komentarz jest przypisany do elementu)
  elementName?: string; // Nazwa elementu dla łatwiejszego wyświetlania
}

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);

  const addComment = useCallback((text: string, elementId?: string, elementName?: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      timestamp: Date.now(),
      elementId,
      elementName,
    };

    setComments((prev) => [...prev, newComment]);
    return newComment;
  }, []);

  const deleteComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  }, []);

  const getCommentsForElement = useCallback(
    (elementId?: string) => {
      if (!elementId) {
        // Zwróć tylko komentarze ogólne (bez elementId)
        return comments.filter((comment) => !comment.elementId);
      }
      // Zwróć komentarze dla konkretnego elementu
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
  };
}

