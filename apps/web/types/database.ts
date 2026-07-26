export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CardStatus = "todo" | "in-progress" | "done";

export type Database = {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: CardStatus;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          status: CardStatus;
          position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: CardStatus;
          position?: number;
          created_at?: string;
          updated_at?: string;
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

export type CardRow = Database["public"]["Tables"]["cards"]["Row"];
export type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
export type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];
