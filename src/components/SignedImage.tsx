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

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #4F46E5, #7C3AED)', // Indigo to Purple
  'linear-gradient(135deg, #0EA5E9, #2563EB)', // Sky to Blue
  'linear-gradient(135deg, #10B981, #059669)', // Emerald to Green
  'linear-gradient(135deg, #F59E0B, #D97706)', // Amber to Yellow
  'linear-gradient(135deg, #EF4444, #DC2626)', // Red to Dark Red
  'linear-gradient(135deg, #EC4899, #D946EF)', // Pink to Fuchsia
  'linear-gradient(135deg, #8B5CF6, #EC4899)', // Violet to Pink
  'linear-gradient(135deg, #F97316, #E11D48)', // Orange to Rose
];

const isDefaultAvatar = (path?: string) => {
  if (!path) return true;
  if (path.includes('api.dicebear.com')) return true;
  return false;
};

const getInitial = (filePath?: string, fallback?: string, alt?: string): string => {
  if (alt && alt !== 'Costack Storage File' && alt !== 'Apexa Storage File' && alt !== 'Workspace avatar' && alt.trim() !== '') {
    return alt.trim().charAt(0).toUpperCase();
  }
  
  const extractFromUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const seed = urlObj.searchParams.get('seed');
      if (seed) {
        return decodeURIComponent(seed).trim().charAt(0).toUpperCase();
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const seedChar = extractFromUrl(filePath) || extractFromUrl(fallback);
  if (seedChar) return seedChar;

  return 'U';
};

const getGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_GRADIENTS.length;
  return PRESET_GRADIENTS[index];
};

export default function SignedImage({ filePath, fallback, id, className, style, alt, title, bucket = 'avatars', src: providedSrc, onError, ...props }: SignedImageProps) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [imageFailed, setImageFailed] = useState<boolean>(false);

  const providedSrcString = typeof providedSrc === 'string' ? providedSrc : undefined;
  const activePath = filePath || providedSrcString;

  useEffect(() => {
    let active = true;
    setImageFailed(false);
    if (!filePath) {
      setSrc(providedSrcString || fallback || '');
      return;
    }

    // Direct web, blob, relative or base64 image URLs
    if (
      filePath.startsWith('http://') || 
      filePath.startsWith('https://') || 
      filePath.startsWith('blob:') ||
      filePath.startsWith('data:') ||
      filePath.startsWith('/')
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
  }, [filePath, fallback, bucket, providedSrcString]);

  if (isDefaultAvatar(activePath) || imageFailed) {
    const initial = getInitial(activePath, fallback, alt);
    const gradient = getGradient(alt || fallback || activePath || 'User');
    return (
      <div 
        id={id} 
        className={`flex items-center justify-center font-sans font-extrabold text-white uppercase select-none relative ${className || ''}`}
        style={{
          background: gradient,
          containerType: 'size',
          ...style
        }}
        title={title || alt}
      >
        <span style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '45cqmin',
          lineHeight: '1'
        }}>{initial}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div 
        id={id ? `${id}_loading` : undefined}
        className={`animate-pulse bg-slate-200/60 flex items-center justify-center ${className || ''}`}
        style={style}
      />
    );
  }

  return (
    <img 
      id={id} 
      src={src || fallback} 
      alt={alt || 'Costack Storage File'} 
      className={className}
      decoding="async"
      loading="eager"
      style={{
        imageRendering: '-webkit-optimize-contrast',
        ...style
      }}
      {...props}
      onError={(event) => {
        setImageFailed(true);
        onError?.(event);
      }}
    />
  );
}
