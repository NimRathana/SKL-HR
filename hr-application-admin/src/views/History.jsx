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

const getSelectedIds = (rows, selectionModel) => selectionModel.type === "exclude" ? rows.filter((row) => !selectionModel.ids.has(row.id)).map((row) => row.id) : Array.from(selectionModel.ids);
const getSelectedRows = (rows, selectionModel) => selectionModel.type === "exclude"
  ? rows.filter((row) => !selectionModel.ids.has(row.id))
  : rows.filter((row) => selectionModel.ids.has(row.id));

const formatDate = (value) => {
  if (!value) return "-";
  const dateValue = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : "-";
};

const DEFAULT_COMPANY_STORAGE_KEY = "defaultCompanyId";

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail.message === "string") return detail.message;
  if (detail) return JSON.stringify(detail);
  return fallback;
};

const EmploymentHistory = () => {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [positions, setPositions] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectionModel, setSelectionModel] = useState({ type: "include", ids: new Set() });
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    company_id: "",
    position_id: "",
    employment_type: "full_time",
    start_date: "",
    end_date: "",
    status: "active",
    reason: "",
  });
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const api = await getApi();
      const [histories, employeeList, companyList, positionList] =
        await Promise.all([
          api.get("/employment-histories"),
          api.get("/employees"),
          api.get("/companies"),
          api.get("/positions"),
        ]);
      setRows(histories.data || []);
      setEmployees(employeeList.data || []);
      setCompanies(companyList.data || []);
      setPositions(positionList.data || []);
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to load employment history."), "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const update = (e) =>
    setForm((previous) => ({ ...previous, [e.target.name]: e.target.value }));
  const updateEmployment = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "company_id" ? { position_id: "" } : {}),
    }));
  };
  const resetForm = () => {
    setForm({ employee_id: "", company_id: "", position_id: "", employment_type: "full_time", start_date: "", end_date: "", status: "active", reason: "" });
    setOpen(false);
  };
  const openCreate = () => {
    setEditing(null);
    const defaultCompanyId = window.localStorage.getItem(DEFAULT_COMPANY_STORAGE_KEY) || "";
    setForm({
      employee_id: "",
      company_id: companies.some((company) => company.id === defaultCompanyId) ? defaultCompanyId : "",
      position_id: "",
      employment_type: "full_time",
      start_date: "",
      end_date: "",
      status: "active",
      reason: "",
    });
    setOpen(true);
  };
  const submit = async (e) => {
    e.preventDefault();
    const employee = employees.find((item) => item.id === form.employee_id);
    if (!employee) {
      notifyGlobal("Employee is required.", "error");
      return;
    }
    if (!form.position_id) {
      notifyGlobal("Position is required.", "error");
      return;
    }
    if (employee.hire_date && form.start_date < employee.hire_date) {
      notifyGlobal("Start date cannot precede hire date.", "error");
      return;
    }
    if (form.end_date && form.end_date < form.start_date) {
      notifyGlobal("End date cannot precede start date.", "error");
      return;
    }
    try {
      setLoading(true);
      const api = await getApi();
      const payload = {
        ...form,
        end_date: form.end_date || null,
        reason: form.reason || null,
      };
      if (editing) {
        await api.put(`/employment-histories/${editing.id}`, payload);
      } else {
        await api.post("/employment-histories", payload);
      }
      notifyGlobal(editing ? "Employment history updated." : "Employment history created.", "success");
      resetForm();
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to save history."), "error");
      setLoading(false);
    }
  };
  const openEdit = (history) => {
    setEditing(history);
    setForm({
      employee_id: history.employee_id || "",
      company_id: history.company_id || "",
      position_id: history.position_id || "",
      employment_type: history.employment_type || "full_time",
      start_date: history.start_date || "",
      end_date: history.end_date || "",
      status: history.status || "active",
      reason: history.reason || "",
    });
    setOpen(true);
  };
  const toggleStatus = async (history) => {
    const nextStatus = history.status === "active" ? "completed" : "active";
    try {
      setLoading(true);
      await (await getApi()).put(`/employment-histories/${history.id}`, { status: nextStatus });
      notifyGlobal("Employment history status updated.", "success");
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to update employment history status."), "error");
      setLoading(false);
    }
  };
  const remove = async (history) => {
    try {
      setLoading(true);
      await (await getApi()).delete(`/employment-histories/${history.id}`);
      notifyGlobal("Employment history deleted.", "success");
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete history."), "error");
      setLoading(false);
    }
  };
  const removeSelected = async () => {
    try {
      setLoading(true);
      const api = await getApi();
      await api.delete("/employment-histories/bulk-delete", { data: { ids: getSelectedIds(rows, selectionModel) } });
      notifyGlobal("Selected employment history records deleted.", "success");
      setSelectionModel({ type: "include", ids: new Set() });
      setBulkDeleteOpen(false);
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete selected history records."), "error");
      setLoading(false);
    }
  };
  const employeeName = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    return employee
      ? `${employee.first_name} ${employee.last_name}`
      : employeeId;
  };
  const selectedEmployee = employees.find((item) => item.id === form.employee_id);
  const companyName = (companyId) =>
    companies.find((item) => item.id === companyId)?.name || companyId;
  const statusLabel = (status) =>
    String(status || "")
      .replace("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <HistoryLayout
      title="Employment History"
      rows={rows}
      columns={[
        {
          field: "employee_id",
          headerName: "Employee",
          flex: 1.2,
          minWidth: 220,
          valueGetter: (value) => employeeName(value),
          exportValue: (row) => employeeName(row.employee_id),
        },
        {
          field: "company_id",
          headerName: "Company",
          flex: 1,
          minWidth: 170,
          valueGetter: (value) => companyName(value),
          exportValue: (row) => companyName(row.company_id),
        },
        { field: "employment_type", headerName: "Type", width: 130 },
        { field: "start_date", headerName: "Start date", width: 130, valueGetter: (value) => formatDate(value), exportValue: (row) => formatDate(row.start_date) },
        {
          field: "status",
          headerName: "Status",
          width: 145,
          align: "center",
          headerAlign: "center",
          exportValue: (row) => statusLabel(row.status),
          renderCell: (params) => {
            const color = {
              active: "success",
              completed: "info",
              terminated: "error",
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
              <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(params.row)}><Edit fontSize="small" color="primary" /></IconButton></Tooltip>
              {toggleStatus && (
                <Tooltip title={params.row.status === "active" ? "Complete history" : "Set active"}>
                  <Switch
                    size="small"
                    checked={params.row.status === "active"}
                    onChange={() => toggleStatus(params.row)}
                    disabled={loading}
                    inputProps={{ "aria-label": "Change employment history status" }}
                  />
                </Tooltip>
              )}
              <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(params.row)}><Delete fontSize="small" /></IconButton></Tooltip>
            </Stack>
          ),
        },
      ]}
      loading={loading}
      load={load}
      open={open}
      setOpen={setOpen}
      editing={editing}
      setEditing={setEditing}
      openEdit={openEdit}
      toggleStatus={toggleStatus}
      openCreate={openCreate}
      remove={remove}
      deleteTarget={deleteTarget}
      setDeleteTarget={setDeleteTarget}
      selectionModel={selectionModel}
      setSelectionModel={setSelectionModel}
      bulkDeleteOpen={bulkDeleteOpen}
      setBulkDeleteOpen={setBulkDeleteOpen}
      removeSelected={removeSelected}
      submit={submit}
      resetForm={resetForm}
      form={form}
      update={update}
      fields={
        <>
          <SelectField
            name="employee_id"
            label="Employee"
            value={form.employee_id}
            onChange={update}
            options={employees.map((item) => ({
              value: item.id,
              label: `${item.first_name} ${item.last_name}`,
            }))}
          />
          <SelectField
            name="company_id"
            label="Company"
            value={form.company_id}
            onChange={updateEmployment}
            options={companies.map((item) => ({
              value: item.id,
                label: (
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ width: "100%", gap: 1 }}
                  >
                    <span>{item.name}</span>
                    <Chip
                      size="small"
                      label={item.status || "Unknown"}
                      color={String(item.status).toLowerCase() === "active" ? "success" : "default"}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </Stack>
                ),
                disabled: String(item.status).toLowerCase() !== "active",
            }))}
          />
          <SelectField
            name="position_id"
            label="Position"
            value={form.position_id}
            onChange={updateEmployment}
            options={positions
              .filter(
                (item) =>
                  !form.company_id || item.company_id === form.company_id,
              )
              .map((item) => ({ value: item.id, label: item.title }))}
          />
          <SelectField
            name="employment_type"
            label="Employment type"
            value={form.employment_type}
            onChange={update}
            options={["full_time", "part_time", "contract", "intern"].map(
              (value) => ({ value, label: value }),
            )}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ResponsiveDatePicker
            name="start_date"
            label="Start date"
            value={form.start_date ? dayjs(form.start_date) : null}
            onChange={(date) => update({ target: { name: "start_date", value: date?.isValid() ? date.format("YYYY-MM-DD") : "" } })}
            minDate={selectedEmployee?.hire_date ? dayjs(selectedEmployee.hire_date) : undefined}
            format="YYYY-MM-DD"
            slotProps={{ textField: { required: true, size: "small", InputLabelProps: { shrink: true } } }}
          />
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ResponsiveDatePicker
            name="end_date"
            label="End date"
            value={form.end_date ? dayjs(form.end_date) : null}
            onChange={(date) => update({ target: { name: "end_date", value: date?.isValid() ? date.format("YYYY-MM-DD") : "" } })}
            format="YYYY-MM-DD"
            slotProps={{ textField: { size: "small", InputLabelProps: { shrink: true } } }}
          />
          </LocalizationProvider>
          <TextField
            name="reason"
            label="Reason"
            value={form.reason}
            onChange={update}
            size="small"
          />
        </>
      }
    />
  );
};

const SalaryHistory = () => {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectionModel, setSelectionModel] = useState({ type: "include", ids: new Set() });
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    salary_amount: "",
    currency: "USD",
    salary_type: "monthly",
    effective_date: "",
    end_date: "",
    reason: "",
    approved_by: "",
  });
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const api = await getApi();
      const [histories, employeeList, userList] = await Promise.all([
        api.get("/salary-histories"),
        api.get("/employees"),
        api.get("/users"),
      ]);
      setRows(histories.data || []);
      setEmployees(employeeList.data || []);
      setUsers(userList.data || []);
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to load salary history."), "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const ownerOptions = users.filter(
    (item) => item.role?.toLowerCase() === "owner" && item.status?.toLowerCase() === "active",
  );
  const defaultOwnerId = ownerOptions[0]?.id || "";
  useEffect(() => {
    if (!form.approved_by && defaultOwnerId) {
      setForm((previous) => ({ ...previous, approved_by: defaultOwnerId }));
    }
  }, [defaultOwnerId, form.approved_by]);
  const update = (e) =>
    setForm((previous) => ({ ...previous, [e.target.name]: e.target.value }));
  const resetForm = () => {
    setForm({ employee_id: "", salary_amount: "", currency: "USD", salary_type: "monthly", effective_date: "", end_date: "", reason: "", approved_by: defaultOwnerId });
    setOpen(false);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.employee_id) {
      notifyGlobal("Employee is required.", "error");
      return;
    }
    if (!form.approved_by) {
      notifyGlobal("An active owner is required as approver.", "error");
      return;
    }
    if (form.end_date && form.end_date < form.effective_date) {
      notifyGlobal("End date cannot precede effective date.", "error");
      return;
    }
    try {
      setLoading(true);
      const api = await getApi();
      const payload = {
        ...form,
        salary_amount: Number(form.salary_amount),
        end_date: form.end_date || null,
        reason: form.reason || null,
      };
      if (editing) {
        await api.put(`/salary-histories/${editing.id}`, payload);
      } else {
        await api.post("/salary-histories", payload);
      }
      notifyGlobal(editing ? "Salary history updated." : "Salary history created.", "success");
      resetForm();
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to save history."), "error");
      setLoading(false);
    }
  };
  const openEdit = (history) => {
    setEditing(history);
    setForm({
      employee_id: history.employee_id || "",
      salary_amount: history.salary_amount || "",
      currency: history.currency || "USD",
      salary_type: history.salary_type || "monthly",
      effective_date: history.effective_date || "",
      end_date: history.end_date || "",
      reason: history.reason || "",
      approved_by: history.approved_by || "",
    });
    setOpen(true);
  };
  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };
  const remove = async (history) => {
    try {
      setLoading(true);
      await (await getApi()).delete(`/salary-histories/${history.id}`);
      notifyGlobal("Salary history deleted.", "success");
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete history."), "error");
      setLoading(false);
    }
  };
  const removeSelected = async () => {
    try {
      setLoading(true);
      const api = await getApi();
      await api.delete("/salary-histories/bulk-delete", { data: { ids: getSelectedIds(rows, selectionModel) } });
      notifyGlobal("Selected salary history records deleted.", "success");
      setSelectionModel({ type: "include", ids: new Set() });
      setBulkDeleteOpen(false);
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete selected history records."), "error");
      setLoading(false);
    }
  };
  const employeeName = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    return employee
      ? `${employee.first_name} ${employee.last_name}`
      : employeeId;
  };
  return (
    <HistoryLayout
      title="Salary History"
      rows={rows}
      columns={[
        {
          field: "employee_id",
          headerName: "Employee",
          flex: 1.2,
          minWidth: 220,
          valueGetter: (value) => employeeName(value),
          exportValue: (row) => employeeName(row.employee_id),
        },
        { field: "salary_amount", headerName: "Amount", width: 140 },
        { field: "currency", headerName: "Currency", width: 110 },
        { field: "salary_type", headerName: "Type", width: 120 },
        { field: "effective_date", headerName: "Effective date", width: 145, valueGetter: (value) => formatDate(value), exportValue: (row) => formatDate(row.effective_date) },
        {
          field: "actions",
          headerName: "Actions",
          width: 130,
          sortable: false,
          align: "center",
          headerAlign: "center",
          renderCell: (params) => (
           <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" width="100%" height="100%">
              <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(params.row)}><Edit fontSize="small" color="primary" /></IconButton></Tooltip>
              <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(params.row)}><Delete fontSize="small" /></IconButton></Tooltip>
            </Stack>
          ),
        },
      ]}
      loading={loading}
      load={load}
      open={open}
      setOpen={setOpen}
      editing={editing}
      setEditing={setEditing}
      openEdit={openEdit}
      openCreate={openCreate}
      remove={remove}
      deleteTarget={deleteTarget}
      setDeleteTarget={setDeleteTarget}
      selectionModel={selectionModel}
      setSelectionModel={setSelectionModel}
      bulkDeleteOpen={bulkDeleteOpen}
      setBulkDeleteOpen={setBulkDeleteOpen}
      removeSelected={removeSelected}
      submit={submit}
      resetForm={resetForm}
      form={form}
      update={update}
      fields={
        <>
          <SelectField
            name="employee_id"
            label="Employee"
            value={form.employee_id}
            onChange={update}
            options={employees.map((item) => ({
              value: item.id,
              label: `${item.first_name} ${item.last_name}`,
            }))}
          />
          <TextField
            name="salary_amount"
            label="Amount"
            type="number"
            value={form.salary_amount}
            onChange={update}
            required
            size="small"
          />
          <TextField
            name="currency"
            label="Currency"
            value={form.currency}
            onChange={update}
            required
            inputProps={{ maxLength: 3 }}
            size="small"
          />
          <SelectField
            name="salary_type"
            label="Salary type"
            value={form.salary_type}
            onChange={update}
            options={["monthly", "daily", "hourly", "annual"].map((value) => ({
              value,
              label: value,
            }))}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ResponsiveDatePicker
            name="effective_date"
            label="Effective date"
            value={form.effective_date ? dayjs(form.effective_date) : null}
            onChange={(date) => update({ target: { name: "effective_date", value: date?.isValid() ? date.format("YYYY-MM-DD") : "" } })}
            format="YYYY-MM-DD"
            slotProps={{ textField: { required: true, size: "small", InputLabelProps: { shrink: true } } }}
          />
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ResponsiveDatePicker
            name="end_date"
            label="End date"
            value={form.end_date ? dayjs(form.end_date) : null}
            onChange={(date) => update({ target: { name: "end_date", value: date?.isValid() ? date.format("YYYY-MM-DD") : "" } })}
            format="YYYY-MM-DD"
            slotProps={{ textField: { size: "small", InputLabelProps: { shrink: true } } }}
          />
          </LocalizationProvider>
          <SelectField
            name="approved_by"
            label="Approved by"
            value={form.approved_by}
            onChange={update}
            options={ownerOptions.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
          <TextField
            name="reason"
            label="Reason"
            value={form.reason}
            onChange={update}
            size="small"
          />
        </>
      }
    />
  );
};

const SelectField = ({ options, name, label, ...props }) => (
  <FormControl fullWidth required size="small">
    <InputLabel id={`${name}-label`}>{label}</InputLabel>
    <Select name={name} labelId={`${name}-label`} label={label} {...props}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
const HistoryLayout = ({
  title,
  rows,
  columns,
  loading,
  load,
  open,
  setOpen,
  setEditing,
  submit,
  editing,
  toggleStatus,
  openCreate,
  remove,
  deleteTarget,
  setDeleteTarget,
  selectionModel,
  setSelectionModel,
  bulkDeleteOpen,
  setBulkDeleteOpen,
  removeSelected,
  fields,
  resetForm,
}) => (
  <Box>
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={1}
      mb={2}
    >
      <Typography variant="h5" fontWeight={700}>
        {title}
      </Typography>

      <Stack
        direction="row"
        spacing={{ xs: 0.75, sm: 1 }}
        alignItems="center"
      >
        <GlobalExportMenu
          rows={getSelectedRows(rows, selectionModel)}
          columns={columns
            .filter((column) => column.field !== "actions")
            .map((column) => ({
              field: column.field,
              header: column.headerName,
              value: column.exportValue,
            }))}
          filename={title === "Employment History" ? "employment-history" : "salary-history"}
          title={title}
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
        columns={columns}
        getRowId={(row) => row.id}
        checkboxSelection
        disableRowSelectionOnClick
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={setSelectionModel}
        loading={loading}
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
        density="compact"
      />
    </Card>
    <Dialog
      open={open}
      onClose={() => !loading && resetForm()}
      fullWidth
      maxWidth="sm"
      PaperProps={{ component: "form", onSubmit: submit }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {editing ? <Edit /> : <Add />}
          {editing ? `Edit ${title}` : `Add ${title}`}
        </Box>
        <IconButton onClick={resetForm} disabled={loading} aria-label={`Close ${title} dialog`}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {fields}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button size="small" variant="outlined" color="error" onClick={resetForm} startIcon={<Cancel />}>
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
      title={deleteTarget ? `Delete ${title}` : `Delete Selected ${title}`}
      message={
        deleteTarget
          ? "Are you sure you want to delete this record?"
          : `Are you sure you want to delete ${getSelectedIds(rows, selectionModel).length} selected record(s)?`
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

export { EmploymentHistory, SalaryHistory };
