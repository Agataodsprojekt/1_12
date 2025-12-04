import { View } from '../../types/views';

/**
 * Repository for managing View storage
 * Single Responsibility: Store and retrieve views
 */
export class ViewRepository {
  private views: Map<string, View> = new Map();
  private activeViewId: string | null = null;

  /**
   * Get all views
   */
  getAll(): View[] {
    return Array.from(this.views.values());
  }

  /**
   * Get view by ID
   */
  getById(id: string): View | undefined {
    return this.views.get(id);
  }

  /**
   * Save a view
   */
  save(view: View): void {
    this.views.set(view.id, view);
  }

  /**
   * Delete a view
   */
  delete(id: string): boolean {
    return this.views.delete(id);
  }

  /**
   * Check if view exists
   */
  has(id: string): boolean {
    return this.views.has(id);
  }

  /**
   * Get active view ID
   */
  getActiveViewId(): string | null {
    return this.activeViewId;
  }

  /**
   * Set active view ID
   */
  setActiveViewId(id: string | null): void {
    this.activeViewId = id;
  }

  /**
   * Get active view
   */
  getActiveView(): View | undefined {
    return this.activeViewId ? this.views.get(this.activeViewId) : undefined;
  }

  /**
   * Clear all views
   */
  clear(): void {
    this.views.clear();
    this.activeViewId = null;
  }

  /**
   * Get count of views
   */
  count(): number {
    return this.views.size;
  }
}
