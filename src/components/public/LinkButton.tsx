"use client";

import { supabase } from "@/lib/supabase";
import { Link as LinkType } from "@/types/database";
import { ExternalLink } from "lucide-react";

interface LinkButtonProps {
  link: LinkType;
  theme: any;
}

export default function LinkButton({ link, theme }: LinkButtonProps) {
  const handleClick = async () => {
    // Increment click count in Supabase
    await supabase.rpc('increment_click_count', { link_id: link.id });
  };

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`
        block w-full p-4 text-center transition-all duration-300 hover-lift
        ${theme.buttonStyle === 'rounded' ? 'rounded-full' : theme.buttonStyle === 'sharp' ? 'rounded-none' : 'rounded-lg'}
        ${theme.buttonStyle === 'outline' ? 'border-2 border-primary bg-transparent' : 'bg-white shadow-sm'}
        flex items-center justify-between group
      `}
    >
      <div className="w-6 h-6" /> {/* Spacer */}
      <span className="font-medium">{link.title}</span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </div>
    </a>
  );
}
