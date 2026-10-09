
'use client';

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import Draggable from 'react-draggable';
import GlobalExportMenu from '@components/GlobalExportMenu';

import {
    Autocomplete,
    Box,
    Button,
    Card,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Slide,
    Stack,
    Switch,
    TextField,
    Chip,
    Typography,
    Tooltip
} from '@mui/material';

import { alpha } from '@mui/material/styles';

import {
    Add as AddIcon,
    Business as BusinessIcon,
    Cancel,
    Close as CloseIcon,
    MailOutline as MailOutlineIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';

import { DataGrid } from '@mui/x-data-grid';
import { getApi, getApiErrorMessage, isReadOnlyInactiveAccount } from '@core/api';
import { notifyGlobal } from '@core/notifications';

const formatDate = value => {
  if (!value) return '-';
  const dateValue = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : '-';
};

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_LABELS = {
    active: 'Active',
    inactive: 'Inactive'
};

/* =========================================================
   DIALOG TRANSITION
========================================================= */

const DialogTransition = React.forwardRef(function DialogTransition(
    props,
    ref
) {
    return (
        <Slide
            ref={ref}
            direction='up'
            {...props}
        />
    );
});

/* =========================================================
   DRAGGABLE PAPER
========================================================= */

function DraggablePaper(props) {
    const nodeRef = useRef(null);
    return (
        <Draggable
            nodeRef={nodeRef}
            handle='#draggable-dialog-title'
            cancel='input, textarea, button, select, [role="button"]'
        >
            <Paper
                ref={nodeRef}
                {...props}
            />
        </Draggable>
    );
}

/* =========================================================
   HELPERS
========================================================= */

const normalizeStatus = value => {
    const status = String(value ?? '')
        .trim()
        .toLowerCase();
    return STATUS_LABELS[status] || 'Active';
};

const getSelectedRows = (rows, selectionModel) => rows.filter(row => (
  selectionModel.type === 'exclude'
    ? !selectionModel.ids.has(row.id)
    : selectionModel.ids.has(row.id)
));

/* =========================================================
   USERS PAGE
========================================================= */

const UsersPage = () => {
  const isReadOnly = isReadOnlyInactiveAccount();
    const [users, setUsers] = useState([]);
    const [selectionModel, setSelectionModel] = useState({ type: 'include', ids: new Set() });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignEmail, setAssignEmail] = useState('');
    const [companies, setCompanies] = useState([]);
    const [companyAssignments, setCompanyAssignments] = useState([]);
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [companySaving, setCompanySaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
          setLoading(true);
          const api = await getApi();
          const [usersResponse, companiesResponse, assignmentsResponse] = await Promise.all([
              api.get('/users'),
              api.get('/companies'),
              api.get('/company-users')
          ]);
          const data = usersResponse.data;
          const normalizedUsers = Array.isArray(data)
            ? data.map((user) => ({
                id: user.id,
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                date_of_birth: user.date_of_birth || "",
                address: user.address || "",
                role: user.role || "",
                status: normalizeStatus(user.status),
              }))
            : [];
          setUsers(normalizedUsers);
          setCompanies(Array.isArray(companiesResponse.data) ? companiesResponse.data : []);
          setCompanyAssignments(Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : []);
        } catch (err) {
          notifyGlobal(err.response?.data?.detail || "Failed to load users.", 'error');
        } finally {
          setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const resetAssignForm = () => {
        setAssignEmail('');
    };

    const handleOpenAssignUser = () => {
      if (isReadOnly) return;
        resetAssignForm();
        setAssignDialogOpen(true);
    };

    const handleCloseAssignUser = () => {
        if (submitting) {
            return;
        }
        setAssignDialogOpen(false);
        resetAssignForm();
    };

    const handleToggleUserStatus = async user => {
        const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
        try {
            const api = await getApi();
            await api.patch(`/users/${user.id}/status`, {
                status: nextStatus.toLowerCase()
            });
            notifyGlobal(nextStatus === 'Active' ? 'User activated.' : 'User deactivated.', 'success');
            setUsers((previous) =>
              previous.map((item) =>
                item.id === user.id ? { ...item, status: nextStatus } : item,
              ),
            );
        } catch (err) {
            notifyGlobal(err.response?.data?.detail || 'Failed to update user status.', 'error');
        }
    };

    const handleOpenCompanyDialog = user => {
        setSelectedUser(user);
        setSelectedCompanies(
            companyAssignments
                .filter(assignment => assignment.user_id === user.id)
                .map(assignment => companies.find(company => company.id === assignment.company_id))
                .filter(Boolean)
        );
        setCompanyDialogOpen(true);
    };

    const handleCloseCompanyDialog = () => {
        if (companySaving) return;
        setCompanyDialogOpen(false);
        setSelectedUser(null);
        setSelectedCompanies([]);
    };

    const handleSaveCompanyAssignments = async event => {
        event.preventDefault();
        if (!selectedUser) return;

        try {
            setCompanySaving(true);
            const api = await getApi();
            const existingAssignments = companyAssignments.filter(assignment => assignment.user_id === selectedUser.id);
            const selectedCompanyIds = new Set(selectedCompanies.map(company => company.id));
            const existingCompanyIds = new Set(existingAssignments.map(assignment => assignment.company_id));
            const newCompanyIds = selectedCompanies
                .filter(company => !existingCompanyIds.has(company.id))
                .map(company => company.id);

            await Promise.all([
                ...existingAssignments
                    .filter(assignment => !selectedCompanyIds.has(assignment.company_id))
                    .map(assignment => api.delete(`/company-users/${assignment.id}`)),
                ...(newCompanyIds.length
                    ? [api.post(`/company-users/users/${selectedUser.id}/companies`, { company_ids: newCompanyIds })]
                    : [])
            ]);

            notifyGlobal('Company assignments saved.', 'success');
            setCompanyDialogOpen(false);
            setSelectedUser(null);
            setSelectedCompanies([]);
            await fetchUsers();
        } catch (err) {
            notifyGlobal(err.response?.data?.detail || 'Failed to update company assignments.', 'error');
        } finally {
            setCompanySaving(false);
        }
    };

    const handleSendAssignLink = async event => {
        event.preventDefault();
      if (isReadOnly) {
        notifyGlobal('Inactive accounts can only view data.', 'error');
        return;
      }
        const trimmedEmail = assignEmail.trim();

        if (!trimmedEmail) {
          notifyGlobal('Please enter the user email address.', 'error');
            return;
        }

        try {
            setSubmitting(true);
            const api = await getApi();
            await api.post('/users/invite', {
                email: trimmedEmail
            });

            notifyGlobal(`Invitation link and verification code sent to ${trimmedEmail}.`, 'success');
            setAssignDialogOpen(false);
            resetAssignForm();
        } catch (err) {
            const message = getApiErrorMessage(err, 'Failed to send invitation.');
            notifyGlobal(message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
      {
        field: "name",
        headerName: "User name",
        flex: 1.5,
        minWidth: 180,
        exportHeader: "User name",
        renderCell: (params) => (
          <Stack justifyContent="center" height="100%">
            <Typography variant="body2" fontWeight={600}>
              {params.value}
            </Typography>
          </Stack>
        ),
      },

      {
        field: "email",
        headerName: "Email",
        flex: 2,
        minWidth: 220,
        exportHeader: "Email",
      },

      {
        field: "phone",
        headerName: "Phone",
        exportHeader: "Phone",
        flex: 1,
        minWidth: 140,
        valueGetter: (value) => value || "-",
      },

      {
        field: "date_of_birth",
        headerName: "Date of birth",
        exportHeader: "Date of birth",
        flex: 1,
        minWidth: 145,
        valueGetter: (value) => formatDate(value),
      },

      {
        field: "address",
        headerName: "Address",
        exportHeader: "Address",
        flex: 1.5,
        minWidth: 180,
        valueGetter: (value) => value || "-",
      },

      {
        field: "role",
        headerName: "Role",
        exportHeader: "Role",
        flex: 1,
        minWidth: 130,
        renderCell: (params) => {
          const role = String(params.value || "").toLowerCase();

          const roleConfig = {
            admin: {
              label: "Admin",
              color: "primary",
            },
            owner: {
              label: "Owner",
              color: "warning",
            },
            hr: {
              label: "HR",
              color: "success",
            },
          };

          const config = roleConfig[role] || {
            label: "User",
            color: "default",
          };

          return (
            <Chip label={config.label} size="small" color={config.color} />
          );
        },
      },

      {
        field: "companies",
        headerName: "Companies",
        exportHeader: "Companies",
        flex: 2.5,
        minWidth: 220,
        sortable: false,
        filterable: false,
        display: "flex",
        renderCell: (params) => {
          const assignedCompanies = companyAssignments
            .filter((assignment) => assignment.user_id === params.row.id)
            .map(
              (assignment) =>
                assignment.company_name ||
                companies.find(
                  (company) => company.id === assignment.company_id,
                )?.name,
            )
            .filter(Boolean);

          if (!assignedCompanies.length) {
            return (
              <Typography variant="body2" color="text.secondary">
                No companies assigned
              </Typography>
            );
          }

          const visibleCompanies = assignedCompanies.slice(0, 2);
          const remainingCount =
            assignedCompanies.length - visibleCompanies.length;

          return (
            <Tooltip title={assignedCompanies.join(", ")}>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ overflow: "hidden" }}
              >
                {visibleCompanies.map((companyName) => (
                  <Chip
                    key={companyName}
                    label={companyName}
                    size="small"
                    sx={{ maxWidth: 110 }}
                  />
                ))}
                {remainingCount > 0 && (
                  <Chip
                    label={`+${remainingCount}`}
                    size="small"
                    color="primary"
                  />
                )}
              </Stack>
            </Tooltip>
          );
        },
      },

      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 130,
        exportHeader: "Status",
        renderCell: (params) => {
          const isActive = String(params.value).toLowerCase() === "active";
          return (
            <Chip
              label={isActive ? "Active" : "Inactive"}
              size="small"
              color={isActive ? "primary" : "default"}
            />
          );
        },
      },

      {
        field: "actions",
        headerName: "Action",
        width: 220,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const isActive = String(params.row.status).toLowerCase() === "active";
          const isHrUser = String(params.row.role || "").toLowerCase() === "hr";

          return (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              width="100%"
              height="100%"
            >
              <Tooltip title={isActive ? "Deactivate user" : "Activate user"}>
                <Switch
                  checked={isActive}
                  color={isActive ? "primary" : "default"}
                  inputProps={{
                    "aria-label": isActive
                      ? "Deactivate user"
                      : "Activate user",
                  }}
                  onChange={() => handleToggleUserStatus(params.row)}
                />
              </Tooltip>
              <Tooltip
                title={
                  isHrUser
                    ? "Assign companies"
                    : "Only HR users can be assigned companies"
                }
              >
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    aria-label={`Assign companies to ${params.row.name}`}
                    onClick={() => handleOpenCompanyDialog(params.row)}
                    disabled={!isHrUser}
                  >
                    <BusinessIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        },
      },
    ];

    const exportColumns = columns.map(column => ({
      field: column.field,
      header: column.exportHeader || column.headerName,
      value: column.exportValue,
    }))
    const selectedUsers = getSelectedRows(users, selectionModel)

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          flex: 1,
          minHeight: 0,
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          pb={2}
        >
          <Typography variant="h5" fontWeight={700}>
            Users
          </Typography>
          <Stack direction="row" spacing={1}>
            <GlobalExportMenu
              rows={selectedUsers}
              columns={exportColumns}
              filename='users'
              title='User list'
              disabled={loading}
            />
            <Button size="small"
              onClick={fetchUsers}
              startIcon={<RefreshIcon />}
              disabled={loading}
            >
              Refresh
            </Button>
            <Tooltip title={isReadOnly ? 'Inactive accounts can only view data.' : ''}>
              <span>
                <Button size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAssignUser}
                  disabled={loading || isReadOnly}
                >
                  Add
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Card className="app-grid-container">
          <DataGrid
            rows={users}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 10,
                  page: 0,
                },
              },
            }}
            checkboxSelection
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={setSelectionModel}
            disableRowSelectionOnClick
            density="compact"
          />
        </Card>

        <Dialog
          open={assignDialogOpen}
          onClose={handleCloseAssignUser}
          PaperComponent={DraggablePaper}
          TransitionComponent={DialogTransition}
          transitionDuration={{
            enter: 300,
            exit: 200,
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            component: "form",
            onSubmit: handleSendAssignLink
          }}
        >
          <DialogTitle
            id="draggable-dialog-title"
            component="div"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "move",
              userSelect: "none",
              "& .MuiTypography-root": {
                color: "inherit",
              },
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.75,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: (theme) =>
                    alpha(
                      theme.palette.common.white,
                      theme.palette.mode === "dark" ? 0.2 : 0.28,
                    ),
                  color: "inherit",
                }}
              >
                <MailOutlineIcon fontSize="small" />
              </Box>

              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  lineHeight={1.2}
                >
                  Assign User
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Send an invitation to a new user
                </Typography>
              </Box>
            </Stack>

            <IconButton
              onClick={handleCloseAssignUser}
              onMouseDown={(event) => event.stopPropagation()}
              disabled={submitting}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.75}>
              <TextField
                fullWidth
                autoFocus
                required
                label="Email Address"
                type="email"
                value={assignEmail}
                onChange={(event) => setAssignEmail(event.target.value)}
                placeholder="name@company.com"
              />
              <Typography variant="caption" color="text.secondary">
                The invitee will receive a secure setup link and a verification code by email.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button size="small" variant="outlined" color="error" onClick={handleCloseAssignUser} disabled={submitting} startIcon={<Cancel />}> Cancel </Button>
            <Button size="small"
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={15} color="inherit" /> : <MailOutlineIcon fontSize="small" />}
            >
              {submitting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={companyDialogOpen}
          onClose={handleCloseCompanyDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            component: "form",
            onSubmit: handleSaveCompanyAssignments,
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              "& .MuiTypography-root": {
                color: "inherit",
              },
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <BusinessIcon />
              <Box>
                <Typography variant="h6">
                  Assign Companies
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedUser?.name || selectedUser?.email}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={handleCloseCompanyDialog}
              disabled={companySaving}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={companies}
              value={selectedCompanies}
              onChange={(_, value) => setSelectedCompanies(value)}
              getOptionLabel={(company) => `${company.name} (${company.code})`}
              getOptionDisabled={(company) => String(company.status).toLowerCase() !== "active"}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Companies"
                  placeholder={
                    selectedCompanies.length
                      ? ""
                      : "Select one or more companies"
                  }
                />
              )}
              renderOption={(props, company) => (
                <li {...props} key={company.id}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%", gap: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {company.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {company.code}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={company.status || "Unknown"}
                      color={String(company.status).toLowerCase() === "active" ? "success" : "default"}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </Stack>
                </li>
              )}
              noOptionsText="No companies available"
            />
          </DialogContent>
          <DialogActions>
            <Button size="small" variant="outlined" color="error" onClick={handleCloseCompanyDialog} disabled={companySaving} startIcon={<Cancel />}> Cancel </Button>
            <Button size="small"
              type="submit"
              variant="contained"
              disabled={companySaving}
              startIcon={
                companySaving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <BusinessIcon />
                )
              }
            >
              Save Assignments
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
};


export default UsersPage;
