import { useState, type ReactNode } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export interface ActionMenuItem {
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
  destructive?: boolean;
  divider?: boolean;
}

export interface ActionMenuProps {
  actions: ActionMenuItem[];
  ariaLabel?: string;
}

export function ActionMenu({
  actions,
  ariaLabel = 'Actions de ligne',
}: ActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Filter out completely hidden items to exclude them from the DOM
  const visibleActions = actions.filter((action) => !action.hidden);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 2,
          sx: { minWidth: 150 },
        }}
      >
        {visibleActions.map((action, index) => {
          if (action.divider) {
            return <Divider key={`divider-${index}`} sx={{ my: 0.5 }} />;
          }

          return (
            <MenuItem
              key={index}
              disabled={action.disabled}
              onClick={() => {
                handleClose();
                if (action.onClick) {
                  action.onClick();
                }
              }}
              sx={{
                color: action.destructive ? 'error.main' : 'text.primary',
                '&:hover': {
                  bgcolor: action.destructive ? 'error.lighter' : undefined,
                },
              }}
            >
              {action.icon && (
                <ListItemIcon
                  sx={{
                    color: action.destructive ? 'error.main' : 'text.secondary',
                    minWidth: '32px !important',
                  }}
                >
                  {action.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={action.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: action.destructive ? 600 : 500,
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
