import { useState, useRef, useEffect } from "react";
import { Trash2, MessageSquare, Package, GripVertical } from "lucide-react";
import { Comment } from "../hooks/useComments";

interface CommentPanelProps {
  comments: Comment[];
  selectedElementId?: string;
  selectedElementName?: string;
  onAddComment: (text: string, elementId?: string, elementName?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
  onCommentClick?: (elementId: string) => void;
}

export default function CommentPanel({
  comments,
  selectedElementId,
  selectedElementName,
  onAddComment,
  onDeleteComment,
  onClose,
  onCommentClick,
}: CommentPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(commentText.trim(), selectedElementId, selectedElementName);
      setCommentText("");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtruj komentarze w zależności od zaznaczonego elementu
  const displayedComments = selectedElementId
    ? comments.filter((c) => c.elementId === selectedElementId)
    : comments;

  const generalCommentsCount = comments.filter((c) => !c.elementId).length;
  const elementCommentsCount = comments.filter((c) => c.elementId).length;

  return (
    <div 
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '384px',
        height: 'calc(100vh - 2rem)',
        pointerEvents: 'auto',
      }}
      className="bg-card border border-border rounded-lg shadow-xl flex flex-col z-50 select-none"
    >
      {/* Header - przeciągalny */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-4 border-b border-border cursor-grab active:cursor-grabbing"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Komentarze</h2>
        </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Zamknij panel"
        >
          ✕
        </button>
      </div>

      {/* Info o zaznaczonym elemencie */}
      {selectedElementId && (
        <div className="p-3 bg-primary/10 border-b border-border flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Zaznaczony element:</p>
            <p className="text-xs text-muted-foreground">
              {selectedElementName || `ID: ${selectedElementId}`}
            </p>
          </div>
        </div>
      )}

      {/* Statystyki */}
      <div className="p-3 bg-muted/30 border-b border-border flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Ogólne:</span>{" "}
          <span className="font-semibold">{generalCommentsCount}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Do elementów:</span>{" "}
          <span className="font-semibold">{elementCommentsCount}</span>
        </div>
      </div>

      {/* Lista komentarzy */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {displayedComments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>
              {selectedElementId
                ? "Brak komentarzy dla tego elementu"
                : "Brak komentarzy"}
            </p>
          </div>
        ) : (
          displayedComments.map((comment) => (
            <div
              key={comment.id}
              className={`bg-muted/50 rounded-lg p-3 border border-border ${
                comment.elementId && onCommentClick ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""
              }`}
              onClick={() => {
                if (comment.elementId && onCommentClick) {
                  onCommentClick(comment.elementId);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {comment.elementId ? (
                    <Package className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {comment.elementName && (
                      <p className="text-xs font-medium text-primary truncate">
                        {comment.elementName}
                        {comment.elementId && onCommentClick && (
                          <span className="ml-1 text-xs text-muted-foreground">(kliknij aby podświetlić)</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(comment.timestamp)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteComment(comment.id);
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  aria-label="Usuń komentarz"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {comment.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Formularz dodawania komentarza */}
      <form 
        onSubmit={handleSubmit} 
        className="p-4 border-t border-border"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-2">
          <label htmlFor="comment-input" className="text-sm font-medium block mb-1">
            {selectedElementId
              ? `Dodaj komentarz do elementu`
              : "Dodaj komentarz ogólny"}
          </label>
          <textarea
            id="comment-input"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Wpisz komentarz..."
            className="w-full px-3 py-2 bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Dodaj komentarz
        </button>
      </form>
    </div>
  );
}

