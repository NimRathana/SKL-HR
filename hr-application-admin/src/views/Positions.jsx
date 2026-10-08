"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  InputLabel,
  IconButton,
  MenuItem,
  Menu,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Add, Cancel, Close, Delete, Edit, FileDownload, KeyboardArrowDown, KeyboardArrowUp, Refresh, Save } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { getApi } from "@core/api";
import { notifyGlobal } from "@core/notifications";
import ConfirmDeleteDialog from "@components/ConfirmDeleteDialog";

const empty = { company_id: "", code: "", title: "", description: "" };
const DEFAULT_COMPANY_STORAGE_KEY = "defaultCompanyId";
const GRID_ROW_HEIGHT = 39;

const getSelectedIds = (rows, selectionModel) => selectionModel.type === "exclude" ? rows.filter((row) => !selectionModel.ids.has(row.id)).map((row) => row.id) : Array.from(selectionModel.ids);
const getCompanySelectedIds = (companyRows, selectionModel) => selectionModel.type === "exclude" ? companyRows.filter((row) => !selectionModel.ids.has(row.id)).map((row) => row.id) : companyRows.filter((row) => selectionModel.ids.has(row.id)).map((row) => row.id);
const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail.message === "string") return detail.message;
  if (detail) return JSON.stringify(detail);
  return fallback;
};

const PositionsPage = () => {
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [companyDeleteTarget, setCompanyDeleteTarget] = useState(null);
  const [selectionModel, setSelectionModel] = useState({ type: "include", ids: new Set() });
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedCompanyIds, setExpandedCompanyIds] = useState(() => new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState("");
  const [companySortDirection, setCompanySortDirection] = useState("asc");
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const api = await getApi();
      const [positions, companyList] = await Promise.all([
        api.get("/positions"),
        api.get("/companies"),
      ]);
      setRows(positions.data || []);
      setCompanies(companyList.data || []);
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to load positions."), "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const api = await getApi();
      if (editing) {
        await api.put(`/positions/${editing.id}`, form);
      } else {
        await api.post("/positions", form);
      }
      notifyGlobal(editing ? "Position updated." : "Position created.", "success");
      setOpen(false);
      setForm(empty);
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to save position."), "error");
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
  const openEdit = (position) => {
    setEditing(position);
    setForm({
      company_id: position.company_id || "",
      code: position.code || "",
      title: position.title || "",
      description: position.description || "",
    });
    setOpen(true);
  };
  const remove = async (position) => {
    try {
      setLoading(true);
      await (await getApi()).delete(`/positions/${position.id}`);
      notifyGlobal("Position deleted.", "success");
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete position."), "error");
      setLoading(false);
    }
  };
  const removeSelected = async () => {
    try {
      setLoading(true);
      const api = await getApi();
      await api.delete("/positions/bulk-delete", { data: { ids: getSelectedIds(rows, selectionModel) } });
      notifyGlobal("Selected positions deleted.", "success");
      setSelectionModel({ type: "include", ids: new Set() });
      setBulkDeleteOpen(false);
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete selected positions."), "error");
      setLoading(false);
    }
  };
  const removeCompanyPositions = async (companyGroup) => {
    try {
      setLoading(true);
      await (await getApi()).delete("/positions/bulk-delete", {
        data: { ids: companyGroup.positions.map((position) => position.id) },
      });
      notifyGlobal("Company positions deleted.", "success");
      setSelectionModel({ type: "include", ids: new Set() });
      setCompanyDeleteTarget(null);
      await load();
    } catch (err) {
      notifyGlobal(getErrorMessage(err, "Failed to delete company positions."), "error");
      setLoading(false);
    }
  };
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const companiesWithPositions = useMemo(() => {
    const groups = new Map();
    rows.forEach((position) => {
      const companyId = position.company_id || "unassigned";
      const company = companies.find((item) => item.id === companyId);
      if (!groups.has(companyId)) {
        groups.set(companyId, {
          id: companyId,
          name: company?.name || "Unassigned company",
          positions: [],
        });
      }
      groups.get(companyId).positions.push(position);
    });

    return [...groups.values()].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return companySortDirection === "asc" ? comparison : -comparison;
    });
  }, [companies, companySortDirection, rows]);
  const filteredCompanies = useMemo(() => {
    const normalizedFilter = filter.trim().toLocaleLowerCase();
    if (!normalizedFilter) return companiesWithPositions;

    return companiesWithPositions.flatMap((companyGroup) => {
      if (companyGroup.name.toLocaleLowerCase().includes(normalizedFilter)) {
        return [companyGroup];
      }

      const positions = companyGroup.positions.filter((position) =>
        [position.code, position.title, position.description]
          .some((value) => String(value || "").toLocaleLowerCase().includes(normalizedFilter)),
      );

      return positions.length ? [{ ...companyGroup, positions }] : [];
    });
  }, [companiesWithPositions, filter]);
  const paginatedCompanies = filteredCompanies.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const exportPositions = (format) => {
    const exportRows = filteredCompanies.flatMap((companyGroup) =>
      companyGroup.positions.map((position) => ({
        company: companyGroup.name,
        code: position.code || "",
        title: position.title || "",
        description: position.description || "",
      })),
    );
    const headers = ["Company", "Code", "Title", "Description"];
    if (format === "csv") {
      const content = [
        headers.map((value) => `"${value}"`).join(","),
        ...exportRows.map((row) =>
          [row.company, row.code, row.title, row.description]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(","),
        ),
      ].join("\r\n");
      const blobUrl = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = "positions.csv";
      downloadLink.click();
      URL.revokeObjectURL(blobUrl);
    } else {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character]);
        const tableRows = exportRows.map((row) =>
          `<tr>${[row.company, row.code, row.title, row.description].map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`,
        ).join("");
        printWindow.document.write(`<!doctype html><html><head><title>Positions</title><style>
          body{font-family:Arial,sans-serif;color:#222;padding:24px}h1{font-size:20px;margin:0 0 16px}
          table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:8px;text-align:left;vertical-align:top}
          th{background:#eee}@media print{body{padding:0}}
        </style></head><body><h1>Positions</h1><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
    setExportMenuAnchor(null);
  };
  useEffect(() => {
    setPage((previous) => Math.min(previous, Math.max(0, Math.ceil(filteredCompanies.length / rowsPerPage) - 1)));
  }, [filteredCompanies.length, rowsPerPage]);
  const toggleExpanded = (companyId) => {
    setExpandedCompanyIds((previous) => {
      const next = new Set(previous);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };
  const handleCompanySelectionChange = (companyRows, nextSelectionModel) => {
    const companyIds = new Set(companyRows.map((row) => row.id));
    const nextSelectedIds = new Set(getCompanySelectedIds(companyRows, nextSelectionModel));

    setSelectionModel((current) => ({
      type: "include",
      ids: new Set([
        ...getSelectedIds(rows, current).filter((id) => !companyIds.has(id)),
        ...nextSelectedIds,
      ]),
    }));
  };
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
          Positions
        </Typography>

        <Stack
          direction="row"
          spacing={{ xs: 0.75, sm: 1 }}
          alignItems="center"
        >
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
      <Card
        className="app-grid-container"
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ p: 2, rowGap: 1 }}
        >
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownload />}
              endIcon={<KeyboardArrowDown />}
              onClick={(event) => setExportMenuAnchor(event.currentTarget)}
              aria-haspopup="menu"
              aria-expanded={Boolean(exportMenuAnchor)}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={() => setExportMenuAnchor(null)}
            >
              <MenuItem onClick={() => exportPositions("csv")}>Export as CSV</MenuItem>
              <MenuItem onClick={() => exportPositions("pdf")}>Export as PDF</MenuItem>
            </Menu>
          </>
          <TextField
            size="small"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(0);
            }}
            placeholder="Filter Company"
            sx={{ ml: "auto" }}
          />
        </Stack>
        <TableContainer
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <Table size="small" stickyHeader sx={{ width: "100%", minWidth: 400, tableLayout: "fixed" }}>
            <TableHead
              sx={{
                "& .MuiTableCell-root": {
                  backgroundColor: "var(--mui-palette-customColors-tableHeaderBg)",
                  height: GRID_ROW_HEIGHT,
                  borderBottom: 1,
                  borderColor: "divider",
                  fontWeight: "var(--unstable_DataGrid-headWeight)",
                },
              }}
            >
              <TableRow>
                <TableCell aria-hidden="true" sx={{ width: 56, p: 0 }} />
                <TableCell sortDirection={companySortDirection}>
                  <TableSortLabel
                    active
                    direction={companySortDirection}
                    onClick={() => setCompanySortDirection((current) => current === "asc" ? "desc" : "asc")}
                  >
                    Company
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && !paginatedCompanies.length && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography color="text.secondary">No positions found.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && paginatedCompanies.map((companyGroup) => {
                const isExpanded = expandedCompanyIds.has(companyGroup.id);
                return (
                  <Fragment key={companyGroup.id}>
                    <TableRow
                      hover
                      sx={{
                        height: GRID_ROW_HEIGHT,
                        backgroundColor: isExpanded ? "action.hover" : "inherit",
                        "& > td": {
                          borderBottom: isExpanded ? 0 : 1,
                          borderColor: "divider",
                        },
                        transition: "background-color 160ms ease",
                      }}
                    >
                      <TableCell
                        sx={{ width: 56, py: 0.5, px: 1, textAlign: "center" }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => toggleExpanded(companyGroup.id)}
                          color={isExpanded ? "primary" : "default"}
                        >
                          {isExpanded ? (
                            <KeyboardArrowUp />
                          ) : (
                            <KeyboardArrowDown />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            fontWeight="var(--unstable_DataGrid-headWeight)"
                            color="inherit"
                            fontSize="inherit"
                          >
                            {companyGroup.name}
                          </Typography>
                          <Chip
                            label={companyGroup.positions.length}
                            size="small"
                            color={isExpanded ? "primary" : "default"}
                            sx={{
                              fontSize: "inherit",
                              fontWeight: "var(--unstable_DataGrid-headWeight)",
                            }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5 }}>
                        <Tooltip
                          title={`Delete all positions for ${companyGroup.name}`}
                        >
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setCompanyDeleteTarget(companyGroup)}
                            disabled={loading}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell
                          aria-hidden="true"
                          sx={{ width: 56, p: 0 }}
                        />
                        <TableCell
                          colSpan={2}
                          sx={{ p: 0, minWidth: 0, width: "calc(100% - 56px)" }}
                        >
                          <Box
                            sx={{
                              width: "100%",
                              maxWidth: 1200,
                              minWidth: 0,
                              mx: "auto",
                              mt: 1.5,
                              mb: 2,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: "var(--mui-shape-borderRadius)",
                            }}
                          >
                            <DataGrid
                              rows={companyGroup.positions}
                              columns={[
                                {
                                  field: "code",
                                  headerName: "Code",
                                  flex: 0.7,
                                  minWidth: 64,
                                  renderCell: (params) => (
                                    <Typography
                                      sx={{
                                        fontSize: "inherit",
                                        color: "primary.main",
                                        display: "flex",
                                        alignItems: "center",
                                        height: "100%",
                                      }}
                                    >
                                      {params.value}
                                    </Typography>
                                  ),
                                },
                                {
                                  field: "title",
                                  headerName: "Title",
                                  flex: 1,
                                  minWidth: 120,
                                },
                                {
                                  field: "description",
                                  headerName: "Description",
                                  flex: 1.2,
                                  minWidth: 160,
                                  valueGetter: (value) => value || "-",
                                },
                                {
                                  field: "actions",
                                  headerName: "Actions",
                                  width: 88,
                                  sortable: false,
                                  filterable: false,
                                  align: "center",
                                  headerAlign: "center",
                                  renderCell: (params) => (
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      alignItems="center"
                                      justifyContent="center"
                                      width="100%"
                                      height="100%"
                                    >
                                      <Tooltip title="Edit">
                                        <IconButton
                                          sx={{
                                            fontSize: "large",
                                            "&:hover": {
                                              backgroundColor:
                                                "transparent !important",
                                            },
                                          }}
                                          onClick={() => openEdit(params.row)}
                                        >
                                          <Edit color="primary" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
                                        <IconButton
                                          sx={{
                                            fontSize: "large",
                                            "&:hover": {
                                              backgroundColor:
                                                "transparent !important",
                                            },
                                          }}
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            setDeleteTarget(params.row)
                                          }
                                        >
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
                              rowSelectionModel={{
                                type: "include",
                                ids: new Set(
                                  companyGroup.positions
                                    .filter((position) =>
                                      getSelectedIds(
                                        rows,
                                        selectionModel,
                                      ).includes(position.id),
                                    )
                                    .map((position) => position.id),
                                ),
                              }}
                              onRowSelectionModelChange={(nextSelectionModel) =>
                                handleCompanySelectionChange(
                                  companyGroup.positions,
                                  nextSelectionModel,
                                )
                              }
                              sx={{
                                width: "100%",
                                height: 380,
                                maxHeight: 380,
                                "& .MuiDataGrid-main, & .MuiDataGrid-virtualScroller":
                                  {
                                    minWidth: 0,
                                  },
                                "& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell":
                                  {
                                    minWidth: 0,
                                  },
                                "& .MuiDataGrid-columnHeaderTitle": {
                                  fontWeight:
                                    "var(--unstable_DataGrid-headWeight)",
                                },
                              }}
                              density="compact"
                              rowHeight={GRID_ROW_HEIGHT}
                              pageSizeOptions={[10, 25, 50, 100]}
                              initialState={{
                                pagination: {
                                  paginationModel: {
                                    pageSize: 10,
                                    page: 0,
                                  },
                                },
                              }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          sx={{
            flexShrink: 0,
            position: "sticky",
            bottom: 0,
            borderTop: 1,
            borderColor: "divider",
          }}
          count={filteredCompanies.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
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
            {editing ? "Edit Position" : "Add Position"}
          </Box>
          <IconButton onClick={() => setOpen(false)} disabled={loading} aria-label="Close position dialog">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl required fullWidth size="small">
              <InputLabel id="position-company-label">Company</InputLabel>
              <Select
                labelId="position-company-label"
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
            <TextField
              name="code"
              label="Code"
              value={form.code}
              onChange={update}
              size="small"
              required
            />
            <TextField
              name="title"
              label="Title"
              value={form.title}
              onChange={update}
              size="small"
              required
            />
            <TextField
              name="description"
              label="Description"
              value={form.description}
              onChange={update}
              size="small"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" variant="outlined" color="error" onClick={() => setOpen(false)} startIcon={<Cancel />}> Cancel </Button>
          <Button size="small" type="submit" variant="contained" disabled={loading} startIcon={<Save />}>
            {editing ? "Save Changes" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget) || Boolean(companyDeleteTarget) || bulkDeleteOpen}
        onClose={() => {
          setDeleteTarget(null);
          setCompanyDeleteTarget(null);
          setBulkDeleteOpen(false);
        }}
        title={
          deleteTarget
            ? "Delete Position"
            : companyDeleteTarget
              ? "Delete Company Positions"
              : "Delete Selected Positions"
        }
        message={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.title}?`
            : companyDeleteTarget
              ? `Are you sure you want to delete all ${companyDeleteTarget.positions.length} position(s) for ${companyDeleteTarget.name}?`
              : `Are you sure you want to delete ${getSelectedIds(rows, selectionModel).length} selected position(s)?`
        }
        loading={loading}
        onConfirm={async () => {
          if (deleteTarget) {
            await remove(deleteTarget);
            setDeleteTarget(null);
          } else if (companyDeleteTarget) {
            await removeCompanyPositions(companyDeleteTarget);
          } else {
            await removeSelected();
          }
        }}
      />
    </Box>
  );
};

export default PositionsPage;
