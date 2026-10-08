"use client";

import { useEffect, useState } from "react";
import { getApi } from "@core/api";
import { notifyGlobal } from "@core/notifications";
import ConfirmDeleteDialog from "@components/ConfirmDeleteDialog";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Add, Cancel, Close, DeleteOutline, Edit, EditOutlined, Save, TuneOutlined } from "@mui/icons-material";

const emptyForm = {
  plan_type: "",
  name: "",
  description: "",
  price: "0.00",
  currency: "USD",
  billing_interval: "monthly",
  max_employees: "",
  max_companies: "",
  max_hr_users: "",
  features: {},
};

const getPlanTypeCode = (planType) =>
  typeof planType === "string" ? planType : planType?.code || "";

const defaultFeatureKeys = [
  "employee_management",
  "employment_history",
  "salary_history",
  "performance_management",
  "advanced_reports",
];

const featureLabel = (key) => key
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [planTypes, setPlanTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newFeatureName, setNewFeatureName] = useState("");
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeDrafts, setTypeDrafts] = useState({});
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [typeSaving, setTypeSaving] = useState(false);
  const [planTypeToDelete, setPlanTypeToDelete] = useState(null);

  const featureKeys = [...new Set([
    ...defaultFeatureKeys,
    ...plans.flatMap((plan) => Object.keys(plan.features || {})),
    ...Object.keys(form.features || {}),
  ])].sort();
  const planGroups = Object.values(plans.reduce((groups, plan) => {
    const name = plan.name.replace(/\s+(monthly|yearly)$/i, "");
    const groupKey = `${plan.plan_type}:${name.toLowerCase()}`;
    const group = groups[groupKey] || { plan_type: plan.plan_type, name, plans: [] };
    group.plans.push(plan);
    groups[groupKey] = group;
    return groups;
  }, {})).sort((left, right) => {
    const leftOrder = planTypes.find((type) => type.code === left.plan_type)?.sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = planTypes.find((type) => type.code === right.plan_type)?.sort_order ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.name.localeCompare(right.name);
  });
  const filteredGroups = planGroups.map((group) => {
    const matchingPlans = group.plans.filter((plan) => (
      statusFilter === "all" || (statusFilter === "active" ? plan.is_active : !plan.is_active)
    ));
    const name = group.name || group.plan_type;
    const matchesSearch = `${name} ${group.plan_type} ${group.plans[0]?.description || ""}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = typeFilter === "all" || group.plan_type === typeFilter;
    return { ...group, name, plans: matchingPlans, allPlans: group.plans, matchesSearch, matchesType };
  }).filter((group) => group.matchesSearch && group.matchesType && group.plans.length > 0);

  useEffect(() => {
    let cancelled = false;
    const loadPlans = async () => {
      setLoading(true);
      try {
        const api = await getApi();
        const [plansResponse, typesResponse] = await Promise.all([
          api.get("/plans", { params: { include_inactive: true } }),
          api.get("/plan-types", { params: { include_inactive: true } }),
        ]);
        if (!cancelled) {
          setPlans(plansResponse.data.map((plan) => ({
            ...plan,
            plan_type: getPlanTypeCode(plan.plan_type),
          })));
          setPlanTypes(typesResponse.data);
          setTypeDrafts(Object.fromEntries(typesResponse.data.map((type) => [type.code, {
            name: type.name,
            description: type.description || "",
            sort_order: type.sort_order,
          }])));
        }
      } catch (loadError) {
        if (!cancelled) notifyGlobal(loadError?.response?.data?.detail || "Unable to load pricing plans.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPlans();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const openCreate = (planType = "", interval = "monthly", name = "") => {
    const planTypeCode = getPlanTypeCode(planType);
    setEditingPlan(null);
    const existingInterval = plans.find((plan) => plan.plan_type === planTypeCode);
    setForm({
      ...emptyForm,
      plan_type: planTypeCode,
      billing_interval: interval,
      name,
      max_employees: existingInterval?.max_employees == null ? "" : String(existingInterval.max_employees),
      max_companies: existingInterval?.max_companies == null ? "" : String(existingInterval.max_companies),
      max_hr_users: existingInterval?.max_hr_users == null ? "" : String(existingInterval.max_hr_users),
    });
    setNewFeatureName("");
    setDialogOpen(true);
  };

  const openEdit = (plan) => {
    const planTypeCode = getPlanTypeCode(plan.plan_type);
    setEditingPlan({ ...plan, plan_type: planTypeCode });
    setForm({
      plan_type: planTypeCode,
      name: plan.name.replace(/\s+(monthly|yearly)$/i, ""),
      description: plan.description || "",
      price: String(plan.price),
      currency: plan.currency,
      billing_interval: plan.billing_interval,
      max_employees: plan.max_employees == null ? "" : String(plan.max_employees),
      max_companies: plan.max_companies == null ? "" : String(plan.max_companies),
      max_hr_users: plan.max_hr_users == null ? "" : String(plan.max_hr_users),
      features: plan.features || {},
    });
    setNewFeatureName("");
    setDialogOpen(true);
  };

  const savePlan = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const api = await getApi();
      const payload = {
        ...form,
        name: `${form.name.trim()} ${form.billing_interval === "yearly" ? "Yearly" : "Monthly"}`,
        price: form.price,
        max_employees: form.max_employees === "" ? null : Number(form.max_employees),
        max_companies: form.max_companies === "" ? null : Number(form.max_companies),
        max_hr_users: form.max_hr_users === "" ? null : Number(form.max_hr_users),
        features: form.features,
      };
      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, payload);
      } else {
        await api.post("/plans", payload);
      }
      notifyGlobal(editingPlan ? "Pricing plan updated." : "Pricing plan created.", "success");
      setDialogOpen(false);
      setRefreshKey((key) => key + 1);
    } catch (saveError) {
      notifyGlobal(saveError?.response?.data?.detail || "Unable to save this pricing plan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const setPlanActive = async (plan, isActive) => {
    try {
      const api = await getApi();
      await api.patch(`/plans/${plan.id}/activation`, { is_active: isActive });
      notifyGlobal(isActive ? "Pricing plan activated." : "Pricing plan deactivated.", "success");
      setRefreshKey((key) => key + 1);
    } catch (updateError) {
      notifyGlobal(updateError?.response?.data?.detail || "Unable to update plan availability.", "error");
    }
  };

  const deletePricingPlan = async (plan) => {
    if (!plan) return;
    setSaving(true);
    try {
      const api = await getApi();
      await api.delete(`/plans/${plan.id}`);
      notifyGlobal("Pricing plan deleted.", "success");
      setPlanToDelete(null);
      setRefreshKey((key) => key + 1);
    } catch (deleteError) {
      notifyGlobal(deleteError?.response?.data?.detail || "Unable to delete this pricing plan.", "error");
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    const key = newFeatureName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!key) return;
    setForm((current) => ({ ...current, features: { ...current.features, [key]: true } }));
    setNewFeatureName("");
  };

  const createPlanType = async (event) => {
    event.preventDefault();
    setTypeSaving(true);
    try {
      const api = await getApi();
      await api.post("/plan-types", { name: newTypeName, description: newTypeDescription });
      notifyGlobal("Plan type created.", "success");
      setNewTypeName("");
      setNewTypeDescription("");
      setRefreshKey((key) => key + 1);
    } catch (createError) {
      notifyGlobal(createError?.response?.data?.detail || "Unable to create this plan type.", "error");
    } finally {
      setTypeSaving(false);
    }
  };

  const savePlanType = async (type) => {
    setTypeSaving(true);
    try {
      const api = await getApi();
      await api.put(`/plan-types/${type.code}`, typeDrafts[type.code]);
      notifyGlobal("Plan type updated.", "success");
      setRefreshKey((key) => key + 1);
    } catch (saveError) {
      notifyGlobal(saveError?.response?.data?.detail || "Unable to update this plan type.", "error");
    } finally {
      setTypeSaving(false);
    }
  };

  const setPlanTypeActive = async (type, isActive) => {
    try {
      const api = await getApi();
      await api.patch(`/plan-types/${type.code}/activation`, null, { params: { is_active: isActive } });
      notifyGlobal(isActive ? "Plan type activated." : "Plan type deactivated.", "success");
      setRefreshKey((key) => key + 1);
    } catch (updateError) {
      notifyGlobal(updateError?.response?.data?.detail || "Unable to update this plan type.", "error");
    }
  };

  const deletePlanType = async () => {
    if (!planTypeToDelete) return;
    setTypeSaving(true);
    try {
      const api = await getApi();
      await api.delete(`/plan-types/${planTypeToDelete.code}`);
      notifyGlobal("Plan type deleted.", "success");
      setPlanTypeToDelete(null);
      setRefreshKey((key) => key + 1);
    } catch (deleteError) {
      setPlanTypeToDelete(null);
      notifyGlobal(deleteError?.response?.data?.detail || "Unable to delete this plan type.", "error");
    } finally {
      setTypeSaving(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Pricing plan management
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TuneOutlined />}
            onClick={() => {
              setTypeDialogOpen(true);
            }}
          >
            Manage plan types
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={openCreate}
            disabled={!planTypes.some((type) => type.is_active)}
          >
            Add
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ mt: 3 }}
      >
        <TextField
          size="small"
          label="Search plans"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          size="small"
          label="Plan type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="all">All plan types</MenuItem>
          {planTypes
            .filter((type) => type.is_active)
            .map((type) => (
              <MenuItem key={type.code} value={type.code}>
                {type.name}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Availability"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="all">All plans</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Stack>
      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : filteredGroups.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4 }}>
          No pricing plans have been created.
        </Typography>
      ) : (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {filteredGroups.map((group) => {
            const monthly = group.allPlans.find(
              (plan) => plan.billing_interval === "monthly",
            );
            const yearly = group.allPlans.find(
              (plan) => plan.billing_interval === "yearly",
            );
            const featurePlan = monthly || yearly;
            return (
              <Grid key={group.plan_type} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      gap={1}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={900}>
                          {group.name}
                        </Typography>
                      </Box>
                    </Stack>
                    {featurePlan?.description && (
                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        {featurePlan.description}
                      </Typography>
                    )}
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {[monthly, yearly].map((plan, index) => {
                        const interval = index === 0 ? "monthly" : "yearly";
                        return plan ? (
                          <Stack
                            key={plan.id}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={1}
                            sx={{
                              p: 2,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: "var(--mui-shape-borderRadius)",
                            }}
                          >
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {interval === "monthly" ? "Monthly" : "Yearly"}
                              </Typography>
                              <Typography fontWeight={850} color="primary.main">
                                {new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: plan.currency,
                                }).format(Number(plan.price))}
                                <Typography
                                  component="span"
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {" "}
                                  / {interval === "monthly" ? "month" : "year"}
                                </Typography>
                              </Typography>
                            </Box>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.25}
                            >
                              <Switch
                                size="small"
                                checked={plan.is_active}
                                onChange={(event) =>
                                  setPlanActive(plan, event.target.checked)
                                }
                                inputProps={{
                                  "aria-label": `${interval} plan active`,
                                }}
                              />
                              <IconButton
                                size="small"
                                aria-label={`Edit ${interval} plan`}
                                onClick={() => openEdit(plan)}
                              >
                                <EditOutlined fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`Delete ${interval} plan`}
                                onClick={() => setPlanToDelete(plan)}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        ) : (
                          <Button
                            key={interval}
                            size="small"
                            onClick={() => openCreate(group.plan_type, interval, group.name)}
                            sx={{
                              justifyContent: "flex-start",
                              textTransform: "none",
                            }}
                          >
                            Add {interval} pricing
                          </Button>
                        );
                      })}
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      flexWrap="wrap"
                      sx={{ mt: 2 }}
                    >
                      <Chip
                        label={`${featurePlan?.max_employees ?? "Unlimited"} employees`}
                        size="small"
                      />
                      <Chip
                        label={`${featurePlan?.max_companies ?? "Unlimited"} companies`}
                        size="small"
                      />
                      <Chip
                        label={`${featurePlan?.max_hr_users ?? "Unlimited"} HR users`}
                        size="small"
                      />
                      {Object.entries(featurePlan?.features || {}).map(
                        ([feature, enabled]) => (
                          <Chip
                            key={feature}
                            label={`${featureLabel(feature)}: ${enabled ? "On" : "Off"}`}
                            size="small"
                            variant={enabled ? "outlined" : "filled"}
                          />
                        ),
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog
        open={dialogOpen}
        slotProps={{ paper: { component: "form", onSubmit: savePlan } }}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {editingPlan ? <Edit /> : <Add />}
            {editingPlan ? "Edit Pricing Plan" : "Create Pricing Plan"}
          </Box>
          <IconButton onClick={() => setDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              size="small"
              fullWidth
              required
              label="Plan type"
              value={getPlanTypeCode(form.plan_type)}
              onChange={(event) =>
                setForm({
                  ...form,
                  plan_type: getPlanTypeCode(event.target.value),
                })
              }
            >
              {planTypes
                .filter(
                  (type) =>
                    type.is_active || type.code === editingPlan?.plan_type,
                )
                .map((type) => (
                  <MenuItem key={type.code} value={type.code}>
                    {type.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              size="small"
              label="Name"
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
            <TextField
              size="small"
              label="Description"
              multiline
              minRows={2}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
            <Tabs
              value={form.billing_interval}
              onChange={(_, interval) =>
                setForm((current) => ({
                  ...current,
                  billing_interval: interval,
                }))
              }
              variant="fullWidth"
            >
              <Tab
                value="monthly"
                label="Monthly"
                disabled={Boolean(editingPlan)}
              />
              <Tab
                value="yearly"
                label="Yearly"
                disabled={Boolean(editingPlan)}
              />
            </Tabs>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                size="small"
                label="Price"
                type="number"
                required
                inputProps={{ min: 0, step: "0.01" }}
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
              />
              <TextField
                size="small"
                label="Currency"
                required
                inputProps={{ maxLength: 3 }}
                value={form.currency}
                onChange={(event) =>
                  setForm({
                    ...form,
                    currency: event.target.value.toUpperCase(),
                  })
                }
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                size="small"
                label="Maximum employees"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={form.max_employees}
                onChange={(event) =>
                  setForm({ ...form, max_employees: event.target.value })
                }
              />
              <TextField
                size="small"
                label="Maximum companies"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={form.max_companies}
                onChange={(event) =>
                  setForm({ ...form, max_companies: event.target.value })
                }
              />
              <TextField
                size="small"
                label="Maximum HR users"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={form.max_hr_users}
                onChange={(event) =>
                  setForm({ ...form, max_hr_users: event.target.value })
                }
              />
            </Stack>
            <Box>
              <Typography fontWeight={750} color="inherit" sx={{ mb: 1 }}>
                Included features
              </Typography>
              <FormGroup>
                {featureKeys.map(
                  (feature) =>
                    form.features?.[feature] !== undefined && (
                      <Stack key={feature} direction="row" alignItems="center">
                        <FormControlLabel
                          sx={{ flex: 1 }}
                          control={
                            <Checkbox
                              checked={Boolean(form.features?.[feature])}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  features: {
                                    ...current.features,
                                    [feature]: event.target.checked,
                                  },
                                }))
                              }
                            />
                          }
                          label={featureLabel(feature)}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            setForm((current) => {
                              const features = { ...current.features };
                              delete features[feature];
                              return { ...current, features };
                            })
                          }
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Stack>
                    ),
                )}
              </FormGroup>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="New feature"
                  value={newFeatureName}
                  onChange={(event) => setNewFeatureName(event.target.value)}
                  onKeyDown={(event) =>
                    event.key === "Enter" &&
                    (event.preventDefault(), addFeature())
                  }
                />
                <Button
                  onClick={addFeature}
                  disabled={!newFeatureName.trim()}
                  startIcon={<Add />}
                  sx={{ textTransform: "none" }}
                >
                  Add feature
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            startIcon={<Cancel />}
          >
            {" "}
            Cancel{" "}
          </Button>
          <Button
            size="small"
            type="submit"
            variant="contained"
            startIcon={<Save />}
            disabled={saving}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(planToDelete)}
        title="Delete Pricing Plan"
        message={`${planToDelete?.name || "This plan"} will be permanently deleted. Plans referenced by subscriptions cannot be deleted.`}
        confirmLabel="Delete"
        loading={saving}
        onClose={() => setPlanToDelete(null)}
        onConfirm={() => deletePricingPlan(planToDelete)}
      />

      <Dialog
        open={typeDialogOpen}
        onClose={() => !typeSaving && setTypeDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TuneOutlined /> Manage plan types
          </Box>
          <IconButton onClick={() => setTypeDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={createPlanType}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                label="New type name"
                required
                value={newTypeName}
                onChange={(event) => setNewTypeName(event.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Description"
                value={newTypeDescription}
                onChange={(event) => setNewTypeDescription(event.target.value)}
                sx={{ flex: 2 }}
              />
              <Button
                size="small"
                type="submit"
                variant="contained"
                startIcon={<Add />}
                disabled={typeSaving}
              >
                Create type
              </Button>
            </Stack>
          </Box>
          <Stack spacing={1.5} sx={{ mt: 3 }}>
            {planTypes.map((type) => (
              <Box
                key={type.code}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "var(--mui-shape-borderRadius)",
                  overflow: "hidden",
                  backgroundColor: "background.paper",
                  transition: "all .2s ease",
                }}
              >
                {/* Top section */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: { xs: 1.5, sm: 2 },
                    py: 1.25,
                    backgroundColor: "action.hover",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "var(--mui-shape-borderRadius)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                        fontSize: 13,
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {type.code.charAt(0)}
                    </Box>

                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        sx={{ textTransform: "capitalize" }}
                      >
                        {type.code}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Plan type
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Chip
                      label={type.is_active ? "Active" : "Inactive"}
                      size="small"
                      color={type.is_active ? "success" : "default"}
                      variant={type.is_active ? "filled" : "outlined"}
                    />

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setPlanTypeToDelete(type)}
                      disabled={typeSaving}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                {/* Content */}
                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Display name"
                      value={typeDrafts[type.code]?.name || ""}
                      onChange={(event) =>
                        setTypeDrafts((current) => ({
                          ...current,
                          [type.code]: {
                            ...current[type.code],
                            name: event.target.value,
                          },
                        }))
                      }
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="Description"
                      value={typeDrafts[type.code]?.description || ""}
                      onChange={(event) =>
                        setTypeDrafts((current) => ({
                          ...current,
                          [type.code]: {
                            ...current[type.code],
                            description: event.target.value,
                          },
                        }))
                      }
                    />
                  </Stack>

                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mt: 1.5 }}
                  >
                    <TextField
                      size="small"
                      type="number"
                      label="Display order"
                      inputProps={{
                        min: 0,
                        step: 1,
                      }}
                      value={typeDrafts[type.code]?.sort_order ?? 0}
                      onChange={(event) =>
                        setTypeDrafts((current) => ({
                          ...current,
                          [type.code]: {
                            ...current[type.code],
                            sort_order: Number(event.target.value),
                          },
                        }))
                      }
                      sx={{
                        width: { xs: 120, sm: 140 },
                      }}
                    />

                    <Box sx={{ flex: 1 }} />

                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Switch
                          size="small"
                          checked={type.is_active}
                          onChange={(event) =>
                            setPlanTypeActive(type, event.target.checked)
                          }
                        />
                      }
                      label={
                        <Typography variant="body2" color="inherit">
                          Active
                        </Typography>
                      }
                    />

                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      size="small"
                      onClick={() => savePlanType(type)}
                      disabled={typeSaving}
                    >
                      Save
                    </Button>
                  </Stack>
                </Box>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => setTypeDialogOpen(false)}
            disabled={typeSaving}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(planTypeToDelete)}
        title="Delete Plan Type"
        message={`${planTypeToDelete?.name || "This type"} can only be deleted if no pricing plans or tenants reference it. If it is in use, the API will preserve it and report the references.`}
        loading={typeSaving}
        onClose={() => setPlanTypeToDelete(null)}
        onConfirm={deletePlanType}
      />
    </Box>
  );
}
