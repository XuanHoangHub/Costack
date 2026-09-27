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
  if (!path || typeof path !== 'string') return true;
  const trimmed = path.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return true;
  if (trimmed.includes('api.dicebear.com')) return true;
  return false;
};

const isDirectUrl = (p?: string): boolean => {
  if (!p || typeof p !== 'string') return false;
  const trimmed = p.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/')
  );
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
  const providedSrcString = typeof providedSrc === 'string' ? providedSrc : undefined;
  const activePath = filePath || providedSrcString;

  const getInitialSrc = () => {
    if (isDirectUrl(activePath)) return activePath!;
    if (isDirectUrl(fallback)) return fallback!;
    return '';
  };

  const [src, setSrc] = useState<string>(getInitialSrc);
  const [loading, setLoading] = useState<boolean>(false);
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const attemptedSignedUrlRef = React.useRef<boolean>(false);

  useEffect(() => {
    let active = true;
    setImageFailed(false);
    attemptedSignedUrlRef.current = false;

    if (!activePath) {
      setSrc(fallback || '');
      setLoading(false);
      return;
    }

    if (isDirectUrl(activePath)) {
      setSrc(activePath);
      setLoading(false);
      return;
    }

    // Direct storage object path inside Supabase Storage bucket
    const loadSignedUrl = async () => {
      setLoading(true);
      try {
        const cleanPath = activePath.startsWith(`${bucket}/`)
          ? activePath.slice(bucket.length + 1)
          : (activePath.startsWith('avatars/') ? activePath.slice('avatars/'.length) : activePath);

        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(cleanPath, 86400); // Live for 24h

        if (!active) return;

        if (error) {
          console.warn('[SignedImage] Error getting signed URL:', cleanPath, error.message);
          if (fallback) {
            setSrc(fallback);
          } else {
            setImageFailed(true);
          }
        } else if (data?.signedUrl) {
          setSrc(data.signedUrl);
        }
      } catch (err) {
        console.warn('[SignedImage] Exception resolving signed URL:', err);
        if (active) {
          if (fallback) setSrc(fallback);
          else setImageFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSignedUrl();

    return () => {
      active = false;
    };
  }, [activePath, fallback, bucket]);

  const handleImageError = async (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // If the image that failed was a Supabase storage URL, attempt a signed URL recovery once
    if (!attemptedSignedUrlRef.current && src && (src.includes('/storage/v1/object/public/') || src.includes('/storage/v1/object/'))) {
      attemptedSignedUrlRef.current = true;
      try {
        const match = src.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+?)(?:\?.*)?$/);
        if (match) {
          const matchedBucket = match[1];
          const objectPath = decodeURIComponent(match[2]);
          const { data, error } = await supabase.storage
            .from(matchedBucket)
            .createSignedUrl(objectPath, 86400);
          if (!error && data?.signedUrl) {
            setSrc(data.signedUrl);
            return;
          }
        }
      } catch (e) {
        console.warn('[SignedImage] Fallback signed URL recovery failed:', e);
      }
    }

    setImageFailed(true);
    onError?.(event);
  };

  const effectiveSrc = src || fallback;

  if (isDefaultAvatar(activePath) || imageFailed || (!loading && !effectiveSrc)) {
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

  if (loading && !effectiveSrc) {
    return (
      <div 
        id={id ? `${id}_loading` : undefined}
        className={`animate-pulse bg-slate-200/60 dark:bg-zinc-800 flex items-center justify-center ${className || ''}`}
        style={style}
      />
    );
  }

  return (
    <img 
      id={id} 
      src={effectiveSrc} 
      alt={alt || 'Costack Storage File'} 
      className={className}
      decoding="async"
      loading="eager"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      style={{
        imageRendering: '-webkit-optimize-contrast',
        ...style
      }}
      {...props}
      onError={handleImageError}
    />
  );
}
