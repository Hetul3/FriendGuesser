export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      guesses: {
        Row: {
          accuracy_meters: number | null;
          distance_meters: number | null;
          guessed_at: string;
          guessed_lat: number;
          guessed_lng: number;
          id: string;
          round_id: string;
          user_id: string;
        };
        Insert: {
          accuracy_meters?: number | null;
          distance_meters?: number | null;
          guessed_at?: string;
          guessed_lat: number;
          guessed_lng: number;
          id?: string;
          round_id: string;
          user_id: string;
        };
        Update: {
          accuracy_meters?: number | null;
          distance_meters?: number | null;
          guessed_at?: string;
          guessed_lat?: number;
          guessed_lng?: number;
          id?: string;
          round_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guesses_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          joined_at: string;
          last_seen_at: string;
          room_id: string;
          status: Database["public"]["Enums"]["room_member_status"];
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          last_seen_at?: string;
          room_id: string;
          status?: Database["public"]["Enums"]["room_member_status"];
          user_id: string;
        };
        Update: {
          joined_at?: string;
          last_seen_at?: string;
          room_id?: string;
          status?: Database["public"]["Enums"]["room_member_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          current_round_id: string | null;
          id: string;
          status: Database["public"]["Enums"]["room_status"];
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          current_round_id?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["room_status"];
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          current_round_id?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["room_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_current_round_id_fkey";
            columns: ["current_round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      round_clues: {
        Row: {
          clue_center_lat: number;
          clue_center_lng: number;
          clue_radius_meters: number;
          created_at: string;
          round_id: string;
          updated_at: string;
        };
        Insert: {
          clue_center_lat: number;
          clue_center_lng: number;
          clue_radius_meters: number;
          created_at?: string;
          round_id: string;
          updated_at?: string;
        };
        Update: {
          clue_center_lat?: number;
          clue_center_lng?: number;
          clue_radius_meters?: number;
          created_at?: string;
          round_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "round_clues_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: true;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      round_locations: {
        Row: {
          accuracy_meters: number | null;
          created_at: string;
          exact_lat: number;
          exact_lng: number;
          round_id: string;
        };
        Insert: {
          accuracy_meters?: number | null;
          created_at?: string;
          exact_lat: number;
          exact_lng: number;
          round_id: string;
        };
        Update: {
          accuracy_meters?: number | null;
          created_at?: string;
          exact_lat?: number;
          exact_lng?: number;
          round_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "round_locations_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: true;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      round_participants: {
        Row: {
          joined_at: string;
          reconnected_at: string | null;
          role: Database["public"]["Enums"]["round_participant_role"];
          round_id: string;
          status: Database["public"]["Enums"]["round_participant_status"];
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          reconnected_at?: string | null;
          role: Database["public"]["Enums"]["round_participant_role"];
          round_id: string;
          status?: Database["public"]["Enums"]["round_participant_status"];
          user_id: string;
        };
        Update: {
          joined_at?: string;
          reconnected_at?: string | null;
          role?: Database["public"]["Enums"]["round_participant_role"];
          round_id?: string;
          status?: Database["public"]["Enums"]["round_participant_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "round_participants_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      round_photos: {
        Row: {
          byte_size: number;
          created_at: string;
          height: number | null;
          id: string;
          kind: Database["public"]["Enums"]["photo_kind"];
          mime_type: string;
          round_id: string;
          storage_path: string;
          uploaded_by: string;
          width: number | null;
        };
        Insert: {
          byte_size: number;
          created_at?: string;
          height?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["photo_kind"];
          mime_type: string;
          round_id: string;
          storage_path: string;
          uploaded_by: string;
          width?: number | null;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          height?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["photo_kind"];
          mime_type?: string;
          round_id?: string;
          storage_path?: string;
          uploaded_by?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "round_photos_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      rounds: {
        Row: {
          created_at: string;
          ended_at: string | null;
          ended_reason: Database["public"]["Enums"]["round_end_reason"] | null;
          guess_deadline_at: string | null;
          hider_user_id: string;
          hide_deadline_at: string | null;
          id: string;
          room_id: string;
          started_at: string;
          started_by: string;
          status: Database["public"]["Enums"]["round_status"];
          updated_at: string;
          winner_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          ended_reason?: Database["public"]["Enums"]["round_end_reason"] | null;
          guess_deadline_at?: string | null;
          hider_user_id: string;
          hide_deadline_at?: string | null;
          id?: string;
          room_id: string;
          started_at?: string;
          started_by: string;
          status: Database["public"]["Enums"]["round_status"];
          updated_at?: string;
          winner_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          ended_reason?: Database["public"]["Enums"]["round_end_reason"] | null;
          guess_deadline_at?: string | null;
          hider_user_id?: string;
          hide_deadline_at?: string | null;
          id?: string;
          room_id?: string;
          started_at?: string;
          started_by?: string;
          status?: Database["public"]["Enums"]["round_status"];
          updated_at?: string;
          winner_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rounds_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      can_read_round_clues: {
        Args: {
          target_round_id: string;
        };
        Returns: boolean;
      };
      can_read_round_results: {
        Args: {
          target_round_id: string;
        };
        Returns: boolean;
      };
      is_room_member: {
        Args: {
          target_room_id: string;
        };
        Returns: boolean;
      };
      is_round_hider: {
        Args: {
          target_round_id: string;
        };
        Returns: boolean;
      };
      is_round_seeker: {
        Args: {
          target_round_id: string;
        };
        Returns: boolean;
      };
      shares_room_with_user: {
        Args: {
          target_user_id: string;
        };
        Returns: boolean;
      };
      start_room_round: {
        Args: {
          actor_user_id: string;
          guess_duration_seconds?: number;
          hide_duration_seconds?: number;
          target_room_code: string;
        };
        Returns: string;
      };
    };
    Enums: {
      photo_kind: "environment" | "selfie";
      room_member_status: "joined" | "left";
      room_status: "open" | "in_round" | "closed";
      round_end_reason:
        | "completed"
        | "aborted_by_player"
        | "aborted_by_host"
        | "timeout"
        | "cancelled";
      round_participant_role: "hider" | "seeker";
      round_participant_status:
        | "active"
        | "disconnected"
        | "submitted"
        | "aborted";
      round_status:
        | "hiding"
        | "awaiting_hider_submission"
        | "seeking"
        | "completed"
        | "aborted";
    };
    CompositeTypes: Record<string, never>;
  };
};
