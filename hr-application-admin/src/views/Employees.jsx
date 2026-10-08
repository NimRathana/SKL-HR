"use client";

import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Cancel, Close, Delete, Edit, Refresh, Save } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { getApi } from "@core/api";
import { notifyGlobal } from "@core/notifications";
import ConfirmDeleteDialog from "@components/ConfirmDeleteDialog";
import ResponsiveDatePicker from "@components/ResponsiveDatePicker";
import GlobalExportMenu from "@components/GlobalExportMenu";

const empty = {
  company_id: "",
  position_id: "",
  first_name: "",
  last_name: "",
  gender: "male",
  date_of_birth: "",
  phone: "",
  email: "",
  address: "",
  hire_date: "",
};

const formatDate = (value) => {
  if (!value) return "-";
  const dateValue = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : "-";
};

const getSelectedIds = (rows, selectionModel) =>
  selectionModel.type === "exclude"
    ? rows.filter((row) => !selectionModel.ids.has(row.id)).map((row) => row.id)
    : Array.from(selectionModel.ids);

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail.message === "string") return detail.message;
  if (detail) return JSON.stringify(detail);
  return fallback;
};

const DEFAULT_COMPANY_STORAGE_KEY = "defaultCompanyId";

const EmployeesPage = () => {
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectionModel, setSelectionModel] = useState({ type: "include", ids: new Set() });
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const api = await getApi();
      const [employees, companyList, positionList] = await Promise.all([
        api.get("/employees"),
        api.get("/companies"),
        api.get("/positions"),
      ]);
      setRows(employees.data || []);
      setCompanies(companyList.data || []);
      setPositions(positionList.data || []);
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to load employees."), "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const statusLabel = (status) => String(status || "").replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const companyName = (companyId) => companies.find((company) => company.id === companyId)?.name || "-";
  const positionName = (positionId) => positions.find((position) => position.id === positionId)?.title || "-";
  const toggleStatus = async (employee) => {
    const nextStatus = employee.employment_status === "active" ? "on_leave" : "active";
    try {
      setLoading(true);
      await (await getApi()).put(`/employees/${employee.id}`, { employment_status: nextStatus });
      notifyGlobal("Employee status updated.", "success");
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to update employee status."), "error");
      setLoading(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const api = await getApi();
      const payload = { ...form, date_of_birth: form.date_of_birth || null };
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload);
      } else {
        await api.post("/employees", payload);
      }
      notifyGlobal(editing ? "Employee updated." : "Employee created.", "success");
      setOpen(false);
      setForm(empty);
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to save employee."), "error");
      setLoading(false);
    }
  };
  const openCreate = () => {
    setEditing(null);
    const defaultCompanyId = window.localStorage.getItem(DEFAULT_COMPANY_STORAGE_KEY) || "";
    setForm({
      ...empty,
      company_id: companies.some((company) => company.id === defaultCompanyId) ? defaultCompanyId : "",
    });
    setOpen(true);
  };
  const openEdit = (employee) => {
    setEditing(employee);
    setForm({
      company_id: employee.company_id || "",
      position_id: employee.position_id || "",
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      gender: employee.gender || "male",
      date_of_birth: employee.date_of_birth || "",
      phone: employee.phone || "",
      email: employee.email || "",
      address: employee.address || "",
      hire_date: employee.hire_date || "",
    });
    setOpen(true);
  };
  const remove = async (employee) => {
    try {
      setLoading(true);
      await (await getApi()).delete(`/employees/${employee.id}`);
      notifyGlobal("Employee deleted.", "success");
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete employee."), "error");
      setLoading(false);
    }
  };
  const removeSelected = async () => {
    try {
      setLoading(true);
      const api = await getApi();
      await api.delete("/employees/bulk-delete", { data: { ids: getSelectedIds(rows, selectionModel) } });
      notifyGlobal("Selected employees deleted.", "success");
      setSelectionModel({ type: "include", ids: new Set() });
      setBulkDeleteOpen(false);
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete selected employees."), "error");
      setLoading(false);
    }
  };
  const fields = [
    ["first_name", "First name"],
    ["last_name", "Last name"],
  ];
  const exportColumns = [
    { field: "first_name", header: "First name" },
    { field: "last_name", header: "Last name" },
    { field: "company_id", header: "Company", value: (row) => companyName(row.company_id) },
    { field: "position_id", header: "Position", value: (row) => positionName(row.position_id) },
    { field: "email", header: "Email", value: (row) => row.email || "-" },
    { field: "phone", header: "Phone", value: (row) => row.phone || "-" },
    { field: "date_of_birth", header: "Date of birth", value: (row) => formatDate(row.date_of_birth) },
    { field: "hire_date", header: "Hire date", value: (row) => formatDate(row.hire_date) },
    { field: "gender", header: "Gender", value: (row) => statusLabel(row.gender) },
    { field: "employment_status", header: "Status", value: (row) => statusLabel(row.employment_status) },
  ];
  const selectedRows = selectionModel.type === "exclude"
    ? rows.filter((row) => !selectionModel.ids.has(row.id))
    : rows.filter((row) => selectionModel.ids.has(row.id));
  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          Employees
        </Typography>

        <Stack
          direction="row"
          spacing={{ xs: 0.75, sm: 1 }}
          alignItems="center"
        >
          <GlobalExportMenu
            rows={selectedRows}
            columns={exportColumns}
            filename="employees"
            title="Employee list"
            disabled={loading}
          />
          {getSelectedIds(rows, selectionModel).length > 0 && (
            <>
              {/* Mobile delete icon */}
              <IconButton
                color="error"
                size="small"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={loading}
                sx={{
                  display: { xs: "flex", sm: "none" }
                }}
              >
                <Delete fontSize="small" />
              </IconButton>

              {/* Desktop delete button */}
              <Button
                size="small"
                color="error"
                startIcon={<Delete />}
                onClick={() => setBulkDeleteOpen(true)}
                disabled={loading}
                sx={{
                  display: { xs: "none", sm: "flex" },
                }}
              >
                Delete ({getSelectedIds(rows, selectionModel).length})
              </Button>
            </>
          )}

          {/* Mobile refresh icon */}
          <IconButton
            size="small"
            onClick={load}
            disabled={loading}
            sx={{
              display: { xs: "flex", sm: "none" }
            }}
          >
            <Refresh fontSize="small" color="primary" />
          </IconButton>

          {/* Desktop refresh button */}
          <Button
            size="small"
            onClick={load}
            startIcon={<Refresh fontSize="small" />}
            disabled={loading}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
            }}
          >
            Refresh
          </Button>

          {/* Add button */}
          <Button
            size="small"
            variant="contained"
            startIcon={<Add fontSize="small" />}
            onClick={openCreate}
          >
            Add
          </Button>
        </Stack>
      </Stack>
      <Card className="app-grid-container">
        <DataGrid
          rows={rows}
          columns={[
            { field: "first_name", headerName: "First name", minWidth: 140, flex: 1 },
            { field: "last_name", headerName: "Last name", minWidth: 140, flex: 1 },
            {
              field: "company_id",
              headerName: "Company",
              minWidth: 150,
              flex: 1,
              valueGetter: (value) => companyName(value),
            },
            {
              field: "position_id",
              headerName: "Position",
              minWidth: 150,
              flex: 1,
              valueGetter: (value) => positionName(value),
            },
            { field: "email", headerName: "Email", minWidth: 190, flex: 1.2, valueGetter: (value) => value || "-" },
            { field: "phone", headerName: "Phone", minWidth: 125, width: 125, valueGetter: (value) => value || "-" },
            { field: "date_of_birth", headerName: "Date of birth", minWidth: 135, width: 135, valueGetter: (value) => formatDate(value) },
            { field: "hire_date", headerName: "Hire date", minWidth: 125, width: 125, valueGetter: (value) => formatDate(value) },
            { field: "gender", headerName: "Gender", minWidth: 100, width: 100, valueGetter: (value) => statusLabel(value) },
            {
              field: "employment_status",
              headerName: "Status",
              width: 145,
              align: "center",
              headerAlign: "center",
              renderCell: (params) => {
                const color = {
                  active: "success",
                  on_leave: "warning",
                  suspended: "error",
                  terminated: "default",
                }[params.value] || "default";
                return (
                  <Chip
                    label={statusLabel(params.value)}
                    color={color}
                    size="small"
                    sx={{ textTransform: "capitalize" }}
                  />
                );
              },
            },
            {
              field: "actions",
              headerName: "Actions",
              width: 180,
              sortable: false,
              align: "center",
              headerAlign: "center",
              renderCell: (params) => (
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" width="100%" height="100%">
                  <Tooltip title={params.row.employment_status === "active" ? "Set on leave" : "Set active"}>
                    <Switch
                      size="small"
                      checked={params.row.employment_status === "active"}
                      onChange={() => toggleStatus(params.row)}
                      disabled={loading}
                      inputProps={{ "aria-label": `Change ${params.row.first_name} ${params.row.last_name} status` }}
                    />
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(params.row)}>
                      <Edit fontSize="small" color="primary" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(params.row)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            },
          ]}
          getRowId={(row) => row.id}
          checkboxSelection
          disableRowSelectionOnClick
          density="compact"
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={setSelectionModel}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
        />
      </Card>
      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: "form", onSubmit: submit }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {editing ? <Edit /> : <Add />}
            {editing ? "Edit Employee" : "Add Employee"}
          </Box>
          <IconButton onClick={() => setOpen(false)} disabled={loading} aria-label="Close employee dialog">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl required fullWidth size="small">
              <InputLabel id="employee-company-label">Company</InputLabel>
              <Select
                labelId="employee-company-label"
                name="company_id"
                value={form.company_id}
                label="Company"
                onChange={update}
              >
              <MenuItem value="" disabled>
                Select a company
              </MenuItem>
              {companies.map((company) => (
                <MenuItem
                  key={company.id}
                  value={company.id}
                  disabled={String(company.status).toLowerCase() !== "active"}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ width: "100%", gap: 1 }}
                  >
                    <span>{company.name}</span>
                    <Chip
                      size="small"
                      label={company.status || "Unknown"}
                      color={String(company.status).toLowerCase() === "active" ? "success" : "default"}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </Stack>
                </MenuItem>
              ))}
              </Select>
            </FormControl>
            <FormControl required fullWidth size="small">
              <InputLabel id="employee-position-label">Position</InputLabel>
              <Select
                labelId="employee-position-label"
                name="position_id"
                value={form.position_id}
                label="Position"
                onChange={update}
              >
              <MenuItem value="" disabled>
                Select a position
              </MenuItem>
              {positions
                .filter(
                  (position) =>
                    !form.company_id || position.company_id === form.company_id,
                )
                .map((position) => (
                  <MenuItem key={position.id} value={position.id}>
                    {position.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {fields.map(([name, label]) => (
              <TextField
                key={name}
                name={name}
                label={label}
                value={form[name]}
                onChange={update}
                required
                size="small"
              />
            ))}
            <FormControl fullWidth size="small">
              <InputLabel id="employee-gender-label">Gender</InputLabel>
              <Select
                labelId="employee-gender-label"
                name="gender"
                value={form.gender}
                label="Gender"
                onChange={update}
              >
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <ResponsiveDatePicker
                name="hire_date"
                label="Hire date"
                value={form.hire_date ? dayjs(form.hire_date) : null}
                onChange={(date) => update({ target: { name: "hire_date", value: date?.isValid() ? date.format("YYYY-MM-DD") : "" } })}
                format="YYYY-MM-DD"
                slotProps={{ textField: { required: true, size: "small", InputLabelProps: { shrink: true } } }}
              />
            </LocalizationProvider>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <ResponsiveDatePicker
                name="date_of_birth"
                label="Date of birth"
                value={form.date_of_birth ? dayjs(form.date_of_birth) : null}
                onChange={(date) => update({ target: { name: "date_of_birth", value: date?.isValid() ? date.format("YYYY-MM-DD") : "" } })}
                format="YYYY-MM-DD"
                slotProps={{ textField: { size: "small", InputLabelProps: { shrink: true } } }}
              />
            </LocalizationProvider>
            <TextField name="phone" label="Phone" value={form.phone} onChange={update} size="small" />
            <TextField name="email" label="Email" type="email" value={form.email} onChange={update} size="small" />
            <TextField name="address" label="Address" value={form.address} onChange={update} multiline minRows={2} size="small" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" color="error" onClick={() => setOpen(false)} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button size="small" type="submit" variant="contained" disabled={loading} startIcon={<Save />}>
            {editing ? "Save Changes" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget) || bulkDeleteOpen}
        onClose={() => {
          setDeleteTarget(null);
          setBulkDeleteOpen(false);
        }}
        title={deleteTarget ? "Delete Employee" : "Delete Selected Employees"}
        message={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.first_name} ${deleteTarget.last_name}?`
            : `Are you sure you want to delete ${getSelectedIds(rows, selectionModel).length} selected employee(s)?`
        }
        loading={loading}
        onConfirm={async () => {
          if (deleteTarget) {
            await remove(deleteTarget);
            setDeleteTarget(null);
          } else {
            await removeSelected();
          }
        }}
      />
    </Box>
  );
};

export default EmployeesPage;
