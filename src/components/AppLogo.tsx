import React from 'react';
import appLogoImg from '@/assets/app-logo.png';

export interface AppLogoProps {
  className?: string;
  alt?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = 'h-7 w-7',
  alt = 'YoutubeDownloader logo',
}) => (
  <img
    src={appLogoImg}
    alt={alt}
    draggable={false}
    className={`shrink-0 select-none object-contain ${className}`}
  />
);

export default AppLogo;
