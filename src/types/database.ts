export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  theme_settings: ThemeSettings;
  updated_at: string;
};

export type Link = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  icon: string | null;
  position: number;
  click_count: number;
  is_active: boolean;
  created_at: string;
};

export type ThemeSettings = {
  background: string;
  buttonStyle: 'rounded' | 'sharp' | 'outline' | 'rounded-lg';
  fontFamily: string;
  accentColor: string;
};
