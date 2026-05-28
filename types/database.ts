export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type StandardForm = 'blues' | 'rhythm-changes'

export type KeySignature =
  | 'C major' | 'C minor'
  | 'Db major' | 'Db minor'
  | 'D major' | 'D minor'
  | 'Eb major' | 'Eb minor'
  | 'E major' | 'E minor'
  | 'F major' | 'F minor'
  | 'F# major' | 'F# minor'
  | 'G major' | 'G minor'
  | 'Ab major' | 'Ab minor'
  | 'A major' | 'A minor'
  | 'Bb major' | 'Bb minor'
  | 'B major' | 'B minor'
export type StandardStatus = 'official' | 'pending' | 'submitted'
export type TempoFeel = 'ballad' | 'medium' | 'up-tempo' | 'variable'
export type Platform = 'spotify' | 'apple_music' | 'amazon_music'
export type CollectionStatus = 'know' | 'learning' | 'want_to_learn'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export type EraTag =
  | 'great-american-songbook'
  | 'bebop'
  | 'hard-bop'
  | 'post-bop'
  | 'swing'
  | 'cool'
  | 'modal'
  | 'fusion'
  | 'traditional'

export type FeelTag =
  | 'ballad'
  | 'bossa-nova'
  | 'latin'
  | 'afro-cuban'
  | 'samba'
  | 'funk'
  | 'straight-8ths'

export interface Database {
  public: {
    Tables: {
      standards: {
        Row: {
          id: string
          title: string
          composer: string[]
          year_composed: number | null
          original_key: KeySignature | null
          time_signature: string
          tempo_feel: TempoFeel | null
          form: StandardForm | null
          era_tags: EraTag[]
          feel_tags: FeelTag[]
          factoid: string | null
          is_official: boolean
          status: StandardStatus
          submitted_by: string | null
          source_standard_id: string | null
          upvotes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          composer?: string[]
          year_composed?: number | null
          original_key?: KeySignature | null
          time_signature?: string
          tempo_feel?: TempoFeel | null
          form?: StandardForm | null
          era_tags?: EraTag[]
          feel_tags?: FeelTag[]
          factoid?: string | null
          is_official?: boolean
          status?: StandardStatus
          submitted_by?: string | null
          source_standard_id?: string | null
          upvotes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          composer?: string[]
          year_composed?: number | null
          original_key?: KeySignature | null
          time_signature?: string
          tempo_feel?: TempoFeel | null
          form?: StandardForm | null
          era_tags?: EraTag[]
          feel_tags?: FeelTag[]
          factoid?: string | null
          is_official?: boolean
          status?: StandardStatus
          submitted_by?: string | null
          source_standard_id?: string | null
          upvotes?: number
          updated_at?: string
        }
      }
      recordings: {
        Row: {
          id: string
          standard_id: string
          platform: Platform
          external_url: string
          external_id: string | null
          artist: string
          album_title: string | null
          album_art_url: string | null
          year_recorded: number | null
          duration_ms: number | null
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          standard_id: string
          platform: Platform
          external_url: string
          external_id?: string | null
          artist: string
          album_title?: string | null
          album_art_url?: string | null
          year_recorded?: number | null
          duration_ms?: number | null
          added_by?: string | null
          created_at?: string
        }
        Update: {
          standard_id?: string
          platform?: Platform
          external_url?: string
          external_id?: string | null
          artist?: string
          album_title?: string | null
          album_art_url?: string | null
          year_recorded?: number | null
          duration_ms?: number | null
          added_by?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          is_public: boolean
          musician_mode: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          is_public?: boolean
          musician_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          display_name?: string | null
          bio?: string | null
          is_public?: boolean
          musician_mode?: boolean
          updated_at?: string
        }
      }
      user_standards: {
        Row: {
          id: string
          user_id: string
          standard_id: string
          status: CollectionStatus
          favorite_recording_id: string | null
          notes: string | null
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          standard_id: string
          status?: CollectionStatus
          favorite_recording_id?: string | null
          notes?: string | null
          added_at?: string
        }
        Update: {
          status?: CollectionStatus
          favorite_recording_id?: string | null
          notes?: string | null
        }
      }
      user_recordings: {
        Row: {
          id: string
          user_id: string
          recording_id: string
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recording_id: string
          added_at?: string
        }
        Update: Record<string, never>
      }
      standard_requests: {
        Row: {
          id: string
          title: string
          composer: string | null
          requested_by: string | null
          upvotes: number
          status: RequestStatus
          standard_id: string | null
          request_type: 'new_standard' | 'amendment'
          proposed_changes: Record<string, unknown> | null
          ai_notes: string | null
          reviewed_by_ai: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          composer?: string | null
          requested_by?: string | null
          upvotes?: number
          status?: RequestStatus
          standard_id?: string | null
          request_type?: 'new_standard' | 'amendment'
          proposed_changes?: Record<string, unknown> | null
          ai_notes?: string | null
          reviewed_by_ai?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          composer?: string | null
          upvotes?: number
          status?: RequestStatus
          standard_id?: string | null
          request_type?: 'new_standard' | 'amendment'
          proposed_changes?: Record<string, unknown> | null
          ai_notes?: string | null
          reviewed_by_ai?: boolean
        }
      }
    }
  }
}

export type Standard = Database['public']['Tables']['standards']['Row']
export type Recording = Database['public']['Tables']['recordings']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserStandard = Database['public']['Tables']['user_standards']['Row']
export type StandardRequest = Database['public']['Tables']['standard_requests']['Row']

export type StandardWithUserData = Standard & {
  user_standard?: UserStandard
  recordings?: Recording[]
}
