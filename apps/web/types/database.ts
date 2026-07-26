export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CardStatus = "todo" | "in-progress" | "done";

export type CardPriority = "high" | "medium" | "low";

export type HistoryEventType =
  | "created"
  | "title_changed"
  | "description_changed"
  | "status_changed"
  | "assignee_changed"
  | "priority_changed"
  | "comment_added";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: CardStatus;
          position: number;
          ticket_number: number;
          priority: CardPriority;
          reporter_id: string | null;
          assignee_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          status: CardStatus;
          position: number;
          ticket_number?: number;
          priority?: CardPriority;
          reporter_id?: string | null;
          assignee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: CardStatus;
          position?: number;
          ticket_number?: number;
          priority?: CardPriority;
          reporter_id?: string | null;
          assignee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          card_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      card_history: {
        Row: {
          id: string;
          card_id: string;
          actor_id: string | null;
          event_type: HistoryEventType;
          summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          actor_id?: string | null;
          event_type: HistoryEventType;
          summary: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          actor_id?: string | null;
          event_type?: HistoryEventType;
          summary?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      move_card: {
        Args: {
          p_card_id: string;
          p_status: CardStatus;
          p_position: number;
        };
        Returns: Database["public"]["Tables"]["cards"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CardRow = Database["public"]["Tables"]["cards"]["Row"];
export type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
export type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];
export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
export type CardHistoryRow = Database["public"]["Tables"]["card_history"]["Row"];
