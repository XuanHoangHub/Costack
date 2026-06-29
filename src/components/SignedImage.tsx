"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  filePath?: string;
  fallback?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  title?: string;
  bucket?: string;
}

export default function SignedImage({ filePath, fallback, id, className, style, alt, bucket = 'avatars', ...props }: SignedImageProps) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (!filePath) {
      setSrc(fallback || '');
      return;
    }

    // Direct web or base64 URLs
    if (
      filePath.startsWith('http://') || 
      filePath.startsWith('https://') || 
      filePath.startsWith('data:')
    ) {
      setSrc(filePath);
      return;
    }

    const loadSignedUrl = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 86400); // Live for 24h

        if (error) {
          console.error('[SignedImage] Error getting signed URL:', filePath, error);
          if (active) setSrc(fallback || '');
        } else if (data?.signedUrl && active) {
          setSrc(data.signedUrl);
        }
      } catch (err) {
        console.error('[SignedImage] Exception resolving signed URL:', err);
        if (active) setSrc(fallback || '');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSignedUrl();

    return () => {
      active = false;
    };
  }, [filePath, fallback, bucket]);

  if (loading) {
    return (
      <div 
        id={id ? `${id}_loading` : undefined}
        className={`animate-pulse bg-slate-205 bg-slate-200/60 flex items-center justify-center ${className || ''}`}
        style={style}
      />
    );
  }

  return (
    <img 
      id={id} 
      src={src || fallback} 
      alt={alt || 'Avaxa Storage File'} 
      className={className}
      style={style}
      {...props} 
    />
  );
}
