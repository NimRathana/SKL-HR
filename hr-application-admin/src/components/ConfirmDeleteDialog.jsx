import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { Cancel, Delete } from "@mui/icons-material";

const ConfirmDeleteDialog = ({
  open,
  title,
  message,
  loading = false,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  color = "error",
  icon = <Delete />,
  confirmIcon = <Delete />,
  onClose,
  onConfirm,
}) => (
  <Dialog
    open={open}
    onClose={(event, reason) => {
      if (!loading) onClose(event, reason);
    }}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        backgroundColor: `${color}.main`,
        color: `${color}.contrastText`,
        "& .MuiSvgIcon-root": { fontSize: 22 },
        paddingBlock: 2,
      }}
    >
      {icon}
      {title}
    </DialogTitle>
    <DialogContent dividers>
      <Typography>{message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button variant="outlined" startIcon={<Cancel />} size="small" onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        size="small"
        color={color}
        variant="contained"
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : confirmIcon}
        onClick={onConfirm}
        disabled={loading}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDeleteDialog;
