import React from 'react';
import { Avatar, AvatarProps } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useEmployePhoto } from '../../hooks/useEmployePhoto';

export interface EmployeAvatarProps extends Omit<AvatarProps, 'src'> {
  employeId?: number | null;
  hasPhoto?: boolean;
  updatedTimestamp?: string | number;
  prenom?: string;
  nom?: string;
  src?: string | null;
}

export const EmployeAvatar: React.FC<EmployeAvatarProps> = ({
  employeId,
  hasPhoto,
  updatedTimestamp,
  prenom,
  nom,
  src: overrideSrc,
  children,
  sx,
  ...avatarProps
}) => {
  const { photoUrl } = useEmployePhoto(
    overrideSrc ? null : employeId,
    overrideSrc ? false : hasPhoto,
    updatedTimestamp,
  );

  const displaySrc = overrideSrc || photoUrl;

  const getInitials = (): string | null => {
    if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
    if (nom) return nom[0].toUpperCase();
    if (prenom) return prenom[0].toUpperCase();
    return null;
  };

  const initials = getInitials();

  return (
    <Avatar
      src={displaySrc || undefined}
      sx={{ bgcolor: 'primary.main', ...sx }}
      {...avatarProps}
    >
      {!displaySrc && (initials || children || <PersonIcon fontSize="inherit" />)}
    </Avatar>
  );
};
