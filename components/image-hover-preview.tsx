'use client';

import { useState, useRef } from 'react';
import { Layers, ZoomIn } from 'lucide-react';

export function ImageHoverPreview({
  src,
  alt,
  size = 54,
  previewSize = 280,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  previewSize?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (!src) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          margin: '0 auto',
        }}
      >
        <Layers size={22} style={{ color: '#94a3b8' }} />
      </div>
    );
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    let topY = rect.top - 20;
    if (topY + previewSize > windowHeight - 20) {
      topY = Math.max(10, windowHeight - previewSize - 20);
    }

    setCoords({
      x: rect.right + 14,
      y: topY,
    });
    setIsHovered(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    let topY = rect.top - 20;
    if (topY + previewSize > windowHeight - 20) {
      topY = Math.max(10, windowHeight - previewSize - 20);
    }

    setCoords({
      x: rect.right + 14,
      y: topY,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        margin: '0 auto',
        position: 'relative',
        cursor: 'zoom-in',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.25)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.18s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
        }}
      >
        <ZoomIn size={18} />
      </div>

      {/* Floating Hover Magnified Popover */}
      {isHovered && (
        <div
          style={{
            position: 'fixed',
            left: `${coords.x}px`,
            top: `${coords.y}px`,
            width: `${previewSize}px`,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            boxShadow: '0 20px 40px -5px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            padding: '10px',
            pointerEvents: 'none',
            animation: 'fadeInZoom 0.15s ease-out forwards',
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${previewSize - 30}px`,
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
          <div
            style={{
              padding: '8px 4px 2px',
              fontSize: '12px',
              color: '#334155',
              fontWeight: '600',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {alt}
          </div>
        </div>
      )}
    </div>
  );
}
