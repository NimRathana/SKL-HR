"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@components/Link";
import ConfirmDeleteDialog from "@components/ConfirmDeleteDialog";
import { getApi, getApiErrorMessage } from "@core/api";
import { notifyGlobal } from "@core/notifications";
import {
  Avatar,
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ArrowUpward,
  Cancel,
  CancelOutlined,
  CheckCircle,
  CreditCardOutlined,
  DateRange,
  ManageAccountsOutlined,
  ReceiptLongOutlined,
  TuneOutlined,
  WarningAmberRounded,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not scheduled";
const formatMoney = (value, currency) => value == null || !currency ? "-" : new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));

export default function Billing() {
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("md"));
  const [subscription, setSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [billing, setBilling] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [confirmAction, setConfirmAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadBilling = async () => {
      setLoading(true);
      try {
        const api = await getApi();
        const [
          subscriptionResponse, historyResponse, billingResponse, invoiceResponse, plansResponse
        ] = await Promise.all([
          api.get("/subscriptions/me"),
          api.get("/subscriptions/history"),
          api.get("/billing/me"),
          api.get("/billing/invoices"),
          api.get("/plans"),
        ]);
        if (!cancelled) {
          const currentSubscription = subscriptionResponse.data || historyResponse.data[0] || null;
          setSubscriptionHistory(historyResponse.data);
          setSubscription(currentSubscription);
          setBilling(billingResponse.data);
          setInvoices(invoiceResponse.data);
          setPlans(plansResponse.data);
          setSelectedPlanId(currentSubscription?.pricing_plan_id || plansResponse.data[0]?.id || "");
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          const status = loadError?.response?.status;
          const endpoint = loadError?.config?.url || "billing API";
          const detail = getApiErrorMessage(loadError, "Unable to load billing information.");
          if (status === 403) {
            setError("Billing is available only to tenant owners and administrators.");
          } else if (status === 401) {
            setError("Your session is no longer valid. Sign in again to view billing.");
          } else {
            setError(`${detail} (request: ${endpoint})`);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const changePlan = async () => {
    if (!subscription || !selectedPlanId) return;
    setSaving(true);
    try {
      const api = await getApi();
      const { data: replacement } = await api.put(
        `/subscriptions/${subscription.id}`,
        {
          pricing_plan_id: selectedPlanId,
        },
      );
      if (replacement.status === "pending") {
        const { data: checkout } = await api.post(
          `/subscriptions/${replacement.id}/checkout`,
        );
        if (!checkout?.payment_url)
          throw new Error("The payment provider did not return a checkout URL.");
        setConfirmAction("");
        notifyGlobal("Plan updated. Redirecting to secure checkout.", "success");
        window.setTimeout(() => window.location.assign(checkout.payment_url), 900);
        return;
      }
      setConfirmAction("");
      notifyGlobal("Plan changed successfully.", "success");
      setRefreshKey((key) => key + 1);
    } catch (changeError) {
      notifyGlobal(changeError?.response?.data?.detail || changeError.message || "Unable to change this subscription.", "error");
      setConfirmAction("");
    } finally {
      setSaving(false);
    }
  };

  const continueCheckout = async () => {
    if (!subscription) return;
    setSaving(true);
    try {
      const api = await getApi();
      const { data: checkout } = await api.post(
        `/subscriptions/${subscription.id}/checkout`,
      );
      if (!checkout?.payment_url) {
        throw new Error("The payment provider did not return a checkout URL.");
      }
      window.location.assign(checkout.payment_url);
    } catch (checkoutError) {
      notifyGlobal(checkoutError?.response?.data?.detail || checkoutError.message || "Unable to resume checkout.", "error");
      setSaving(false);
    }
  };

  const cancelSubscription = async () => {
    if (!subscription) return;
    setSaving(true);
    try {
      const api = await getApi();
      await api.post(`/subscriptions/${subscription.id}/cancel`);
      setConfirmAction("");
      notifyGlobal("Subscription cancelled.", "success");
      setRefreshKey((key) => key + 1);
    } catch (cancelError) {
      notifyGlobal(cancelError?.response?.data?.detail || "Unable to cancel this subscription.", "error");
      setConfirmAction("");
    } finally {
      setSaving(false);
    }
  };

  const reactivateSubscription = async () => {
    if (!subscription) return;
    setSaving(true);
    try {
      const api = await getApi();
      await api.post(`/subscriptions/${subscription.id}/reactivate`);
      notifyGlobal("Subscription reactivated.", "success");
      setRefreshKey((key) => key + 1);
    } catch (reactivateError) {
      notifyGlobal(reactivateError?.response?.data?.detail || "Unable to reactivate this subscription.", "error");
    } finally {
      setSaving(false);
    }
  };

  const plan = subscription?.pricing_plan;
  const selectedPlan = plans.find(
    (availablePlan) => availablePlan.id === selectedPlanId,
  );
  const planRequiresUpdate = Boolean(subscription) && !["paid", "not_required"].includes(subscription.payment_status?.toLowerCase());
  const statusColor = subscription?.status === "active" ? "success" : subscription?.status === "pending" ? "warning" : "default";
  const periodStart = subscription?.current_period_start ? new Date(subscription.current_period_start) : null;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const periodDays = periodStart && periodEnd ? Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000)) : 0;
  const elapsedDays = periodStart && periodEnd ? Math.min(periodDays, Math.max(0, Math.ceil((Date.now() - periodStart.getTime()) / 86400000))) : 0;
  const remainingDays = Math.max(0, periodDays - elapsedDays);
  const billingAddress = billing?.billing_address || subscription?.billing_address;
  const usageItems = [
    { key: "employees", label: "Employees" },
    { key: "companies", label: "Companies" },
    { key: "hr_users", label: "HR users" },
  ];
  const invoiceColumns = useMemo(() => 
    [
      {
        field: "invoice_number",
        headerName: "Invoice",
        minWidth: 190,
        flex: 1,
        renderCell: (params) => (
          <Stack justifyContent="center" sx={{ height: "100%", minWidth: 0 }}>
            <Typography variant="body2" fontWeight={750} color="primary.main" noWrap>
              {params.row.invoice_number}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.plan_name}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "billing_period_start",
        headerName: "Billing period",
        minWidth: 230,
        flex: 1,
        renderCell: (params) => `${formatDate(params.row.billing_period_start)} – ${formatDate(params.row.billing_period_end)}`,
      },
      {
        field: "amount_due",
        headerName: "Amount",
        minWidth: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => formatMoney(params.row.amount_due, params.row.currency),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            color={params.value === "paid" ? "success" : params.value === "failed" ? "error" : "default"}
            sx={{ textTransform: "capitalize" }}
          />
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 110,
        sortable: false,
        filterable: false,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Button
            size="small"
            onClick={() => setSelectedInvoice(params.row)}
            sx={{ textTransform: "none" }}
          >
            Preview
          </Button>
        ),
      },
    ],
    [setSelectedInvoice],
  );

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            ACCOUNT / BILLING
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 0.25 }}>
            Billing & subscription
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<TuneOutlined />}
          component={Link}
          href="/#pricing"
          variant="outlined"
          sx={{
            alignSelf: { xs: "flex-start", sm: "center" },
            textTransform: "none",
          }}
        >
          View plans
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 12 }}>
          <CircularProgress />
        </Stack>
      ) : !subscription ? (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                backgroundColor: "action.hover",
                color: "primary.main",
              }}
            >
              <WorkspacePremiumOutlined />
            </Avatar>
            <Typography variant="h6" fontWeight={800} sx={{ mt: 2 }}>
              No current subscription
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Choose a plan to start a subscription for this tenant.
            </Typography>
            <Button
              component={Link}
              href="/#pricing"
              variant="contained"
              sx={{ mt: 2, textTransform: "none" }}
            >
              Browse plans
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                height: "100%",
                overflow: "hidden",
                borderColor: "divider",
              }}
            >
              <Box sx={{ height: 4, backgroundColor: "primary.main" }} />
              <CardContent>
                <Grid container spacing={{ xs: 2.5, md: 4 }}>
                  <Grid size={12}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={2}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ minWidth: 0 }}
                      >
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            backgroundColor: "action.hover",
                            color: "primary.main",
                          }}
                        >
                          <WorkspacePremiumOutlined />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="overline"
                            color="primary.main"
                            fontWeight={800}
                          >
                            CURRENT PLAN
                          </Typography>
                          <Typography
                            variant="h5"
                            fontWeight={850}
                            sx={{ lineHeight: 1.2, overflowWrap: "anywhere" }}
                          >
                            {plan?.name || subscription.plan_id}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip
                        label={subscription.status}
                        color={statusColor}
                        size="small"
                        sx={{
                          flexShrink: 0,
                          textTransform: "capitalize",
                          fontWeight: 750,
                        }}
                      />
                    </Stack>

                    {plan?.description && (
                      <Typography color="text.secondary" sx={{ mt: 2 }}>
                        {plan.description}
                      </Typography>
                    )}

                    <Grid container spacing={1.5} sx={{ mt: 2 }}>
                      <Grid size={{ xs: 12, sm: 5 }}>
                        <Box
                          sx={{
                            p: 3,
                            borderRadius: 1,
                            backgroundColor: "action.hover",
                            height: "100%",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={750}
                          >
                            RECURRING TOTAL
                          </Typography>
                          <Stack
                            direction="row"
                            alignItems="baseline"
                            spacing={0.75}
                            sx={{ mt: 0.5 }}
                          >
                            <Typography
                              variant="h4"
                              fontWeight={850}
                              color="primary.main"
                            >
                              {formatMoney(
                                billing?.amount ?? plan?.price,
                                billing?.currency || plan?.currency,
                              )}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              /{" "}
                              {(billing?.billing_interval || subscription.billing_cycle) === "yearly" ? "year" : "month"}
                            </Typography>
                          </Stack>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 7 }}>
                        <Box
                          sx={{
                            p: 3,
                            borderRadius: "var(--mui-shape-borderRadius)",
                            border: "1px solid",
                            borderColor: "divider",
                            height: "100%",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={750}
                          >
                            {subscription.status === "cancelled" ? "CANCELLED" : "BILLING STATUS"}
                          </Typography>
                          <Typography fontWeight={750} sx={{ mt: 0.5, color: "primary.main" }}>
                            {subscription.status === "cancelled"
                              ? formatDate(subscription.cancelled_at)
                              : subscription.payment_status === "paid" || subscription.payment_status === "not_required"
                                ? `Next renewal · ${formatDate(billing?.renews_at)}`
                                : subscription.payment_status === "checkout_created"
                                  ? "Checkout started · payment incomplete"
                                  : subscription.payment_status === "pending"
                                    ? "Payment required"
                                    : subscription.payment_status}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {billing?.usage && billing?.limits && (
                      <Box sx={{ mt: 2.5 }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ sm: "baseline" }}
                          gap={0.25}
                        >
                          <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                            Plan limits & usage
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Based on {billing.limits_plan_name}
                          </Typography>
                        </Stack>
                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                          {usageItems.map(({ key, label }) => {
                            const used = billing.usage[key];
                            const limit = billing.limits[key];
                            const progress = limit === null ? null : limit === 0 ? used > 0 ? 100 : 0 : Math.min(100, (used / limit) * 100);

                            return (
                              <Grid key={key} size={{ xs: 12, sm: 4 }}>
                                <Box
                                  sx={{
                                    p: 2,
                                    height: "100%",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "var(--mui-shape-borderRadius)",
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    {label}
                                  </Typography>
                                  <Typography variant="subtitle2" fontWeight={800}>
                                    {limit === null ? `${used} active · Unlimited` : `${used} of ${limit}`}
                                  </Typography>
                                  {progress !== null && (
                                    <LinearProgress
                                      variant="determinate"
                                      value={progress}
                                      color={progress >= 90 ? "warning" : "primary"}
                                      sx={{backgroundColor: "action.hover"}}
                                    />
                                  )}
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    )}

                    <Divider sx={{ my: 2.5 }} />
                    <Stack spacing={2} sx={{ width: "100%" }}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        label="Change plan"
                        value={selectedPlanId}
                        onChange={(event) =>
                          setSelectedPlanId(event.target.value)
                        }
                      >
                        {
                          subscription?.pricing_plan_id && !plans.some((availablePlan) => availablePlan.id === subscription.pricing_plan_id) && 
                          (
                            <MenuItem
                              value={subscription.pricing_plan_id}
                              disabled={!plan?.is_active}
                            >
                              {plan?.name || subscription.plan_id}
                            </MenuItem>
                          )
                        }
                        {plans.map((availablePlan) => (
                          <MenuItem
                            key={availablePlan.id}
                            value={availablePlan.id}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              sx={{ width: "99%" }}
                            >
                              <span>{availablePlan.name}</span>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                              >
                                {availablePlan.billing_interval} ·{" "}
                                {formatMoney(availablePlan.price, availablePlan.currency)}
                              </Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </TextField>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="flex-end"
                      >
                        {subscription.status === "pending" && (
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={
                              saving ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <CreditCardOutlined />
                              )
                            }
                            disabled={saving}
                            onClick={continueCheckout}
                          >
                            Continue checkout
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={saving ? (<CircularProgress size={16} color="inherit" />) : (<ArrowUpward />)}
                          disabled={saving || !selectedPlanId || selectedPlanId === subscription.pricing_plan_id || subscription.status !== "active"}
                          onClick={() => setConfirmAction("change")}
                        >
                          Upgrade plan
                        </Button>

                        {subscription.status === "cancelled" ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CheckCircle />}
                            disabled={saving || !plan?.is_active}
                            onClick={reactivateSubscription}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelOutlined />}
                            disabled={saving || !["active", "pending"].includes(subscription.status)}
                            onClick={() => setConfirmAction("cancel")}
                          >
                            Cancel subscription
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Billing Period
                </Typography>
                <Stack spacing={2}>
                  {planRequiresUpdate && (
                    <Alert
                      severity="warning"
                      icon={<WarningAmberRounded />}
                      sx={{ alignItems: "flex-start" }}
                    >
                      <AlertTitle sx={{ mb: 0.25, fontWeight: 800 }}>
                        We need your attention!
                      </AlertTitle>
                      Your plan requires update.
                    </Alert>
                  )}
                  {subscription.cancel_at_period_end && (
                    <Alert severity="warning">
                      This subscription ends when the current billing period expires.
                    </Alert>
                  )}
                  <Box
                    sx={{
                      p: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "var(--mui-shape-borderRadius)",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={2}
                    >
                      <Box>
                        <Typography fontWeight={750}>
                          {subscription.status === "cancelled" ? "Cancelled" : "Active until"}{" "}
                          {formatDate(subscription.current_period_end)}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.25 }}
                        >
                          Started{" "}
                          {formatDate(subscription.current_period_start)}
                        </Typography>
                      </Box>
                      <Chip
                        label={subscription.status}
                        color={statusColor}
                        size="small"
                        sx={{ textTransform: "capitalize" }}
                      />
                    </Stack>
                    {periodDays > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 0.75 }}
                        >
                          <Typography variant="caption" fontWeight={750}>
                            Days {elapsedDays} of {periodDays}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {remainingDays} days left
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={(elapsedDays / periodDays) * 100}
                          color={remainingDays <= 5 ? "warning" : "primary"}
                          sx={{backgroundColor: "action.hover"}}
                        />
                      </Box>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    sx={{
                      width: 38,
                      height: 38,
                      backgroundColor: "action.hover",
                      color: "primary.main",
                    }}
                  >
                    <CreditCardOutlined fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      Payment methods
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Securely managed by your payment provider
                    </Typography>
                  </Box>
                </Stack>
                <Box
                  sx={{
                    mt: 2,
                    p: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "var(--mui-shape-borderRadius)",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={2}
                  >
                    <Box>
                      <Typography fontWeight={750}>
                        {billing?.payment_method || "No saved payment method"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.25 }}
                      >
                        {billing?.payment_method ? "Payment details are stored securely with the payment provider." : "A payment method is collected securely when checkout is required."}
                      </Typography>
                    </Box>
                    <Chip
                      label={billing?.payment_method ? "On file" : "Not set"}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    sx={{
                      width: 38,
                      height: 38,
                      backgroundColor: "action.hover",
                      color: "primary.main",
                    }}
                  >
                    <ManageAccountsOutlined fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      Billing address
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Address on this subscription
                    </Typography>
                  </Box>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-line", mt: 2 }}
                >
                  {billingAddress || "No billing address on file."}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Card>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  gap={2}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        backgroundColor: "action.hover",
                        color: "primary.main",
                      }}
                    >
                      <ReceiptLongOutlined fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={800}>
                        Invoices
                      </Typography>
                      {subscriptionHistory.length > 1 && (
                        <Typography color="text.secondary" variant="body2">
                          {subscriptionHistory.length} subscription records
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                  <Chip
                    label={`${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                {invoices.length === 0 ? (
                  <Typography color="text.secondary" sx={{ mt: 2.5 }}>
                    No invoices yet.
                  </Typography>
                ) : (
                  <>
                    {isDesktop ? (
                      <Box sx={{ minWidth: 0, width: "100%", mt: 1.5 }}>
                        <DataGrid
                          rows={invoices}
                          columns={invoiceColumns}
                          getRowId={(row) => row.id}
                          autoHeight
                          disableRowSelectionOnClick
                          pageSizeOptions={[5, 10, 25, 100]}
                          initialState={{
                            pagination: {
                              paginationModel: { pageSize: 5, page: 0 },
                            },
                          }}
                          density="compact"
                        />
                      </Box>
                    ) : (
                      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                      {invoices.map((invoice) => (
                        <Box
                          key={invoice.id}
                          sx={{
                            minWidth: 0,
                            p: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: "var(--mui-shape-borderRadius)",
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" fontWeight={800} noWrap>
                                {invoice.invoice_number}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {invoice.plan_name}
                              </Typography>
                            </Box>
                            <Chip
                              label={invoice.status}
                              size="small"
                              color={invoice.status === "paid" ? "success" : invoice.status === "failed" ? "error" : "default"}
                              sx={{ flexShrink: 0, textTransform: "capitalize" }}
                            />
                          </Stack>
                          <Divider sx={{ my: 1.25 }} />
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="caption" color="text.secondary">
                                BILLING PERIOD
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(invoice.billing_period_start)} – {formatDate(invoice.billing_period_end)}
                              </Typography>
                            </Box>
                            <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                              <Typography variant="caption" color="text.secondary">
                                TOTAL
                              </Typography>
                              <Typography variant="subtitle2" fontWeight={800}>
                                {formatMoney(invoice.amount_due, invoice.currency)}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Button
                            size="small"
                            fullWidth
                            variant="outlined"
                            onClick={() => setSelectedInvoice(invoice)}
                            sx={{ mt: 1.25, textTransform: "none" }}
                          >
                            Preview invoice
                          </Button>
                        </Box>
                      ))}
                      </Stack>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        fullWidth
        maxWidth="sm"
      >
        {selectedInvoice && (
          <>
            <DialogTitle sx={{ backgroundColor: "background.paper" }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                gap={2}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ minWidth: 0 }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: "var(--mui-shape-borderRadius)",
                      backgroundColor: "action.hover",
                      color: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ReceiptLongOutlined fontSize="medium" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="overline"
                      color="primary.main"
                      fontWeight={700}
                    >
                      INVOICE PREVIEW
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {selectedInvoice.invoice_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {selectedInvoice.plan_name}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label={selectedInvoice.status}
                  size="small"
                  color={selectedInvoice.status === "paid" ? "success" : selectedInvoice.status === "failed" ? "error" : "warning"}
                  sx={{
                    textTransform: "capitalize",
                    fontWeight: 700,
                  }}
                />
              </Stack>

              <Box
                sx={{
                  mt: 2.5,
                  p: 3,
                  borderRadius: "var(--mui-shape-borderRadius)",
                  backgroundColor: "action.hover",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={750}
                >
                  AMOUNT DUE
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ sm: "baseline" }}
                  justifyContent="space-between"
                  gap={0.5}
                >
                  <Typography
                    variant="h4"
                    fontWeight={850}
                    color="primary.main"
                  >
                    {formatMoney(selectedInvoice.amount_due, selectedInvoice.currency)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    {selectedInvoice.plan_name}
                  </Typography>
                </Stack>
              </Box>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={2.5}>
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    fontWeight={750}
                  >
                    INVOICE DETAILS
                  </Typography>
                  <Stack
                    divider={<Divider flexItem />}
                    sx={{
                      mt: 0.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "var(--mui-shape-borderRadius)",
                      px: { xs: 1.5, sm: 2 },
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      gap={2}
                      sx={{ py: 1.25 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Issued
                      </Typography>
                      <Typography variant="body2" fontWeight={650}>
                        {formatDate(selectedInvoice.created_at)}
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={2}
                      sx={{ py: 1.25 }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <DateRange fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Billing period
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        fontWeight={650}
                        textAlign="right"
                      >
                        {formatDate(selectedInvoice.billing_period_start)} –{" "}
                        {formatDate(selectedInvoice.billing_period_end)}
                      </Typography>
                    </Stack>
                    {selectedInvoice.external_reference && (
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        gap={2}
                        sx={{ py: 1.25 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Payment reference
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={650}
                          textAlign="right"
                          sx={{ overflowWrap: "anywhere" }}
                        >
                          {selectedInvoice.external_reference}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>

                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    fontWeight={750}
                  >
                    CHARGE
                  </Typography>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={2}
                    sx={{
                      mt: 0.5,
                      p: { xs: 1.5, sm: 2 },
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "var(--mui-shape-borderRadius)",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={750}>
                        {selectedInvoice.plan_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Plan subscription
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" fontWeight={800}>
                      {formatMoney(selectedInvoice.amount_due, selectedInvoice.currency)}
                    </Typography>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: "var(--mui-shape-borderRadius)",
                    backgroundColor: "action.hover",
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Typography variant="body2" color="text.secondary">
                        Amount due
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatMoney(selectedInvoice.amount_due, selectedInvoice.currency)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Typography variant="body2" color="text.secondary">
                        Amount paid
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color="success.main"
                      >
                        {formatMoney(selectedInvoice.amount_paid, selectedInvoice.currency)}
                      </Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Typography variant="subtitle2" fontWeight={800}>
                        Balance due
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={850}>
                        {formatMoney(Math.max(0, Number(selectedInvoice.amount_due) - Number(selectedInvoice.amount_paid)), selectedInvoice.currency)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<Cancel />}
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(confirmAction)}
        title={confirmAction === "change" ? "Confirm plan change" : "Cancel subscription?"}
        message={confirmAction === "change" ? `Change from ${plan?.name || subscription?.plan_id} to ${selectedPlan?.name || "the selected plan"}? Paid plans continue through secure checkout before the new subscription is active.` : "Your current subscription will be cancelled immediately. This may affect access to your plan."}
        loading={saving}
        color={confirmAction === "change" ? "primary" : "error"}
        icon={confirmAction === "change" ? <ArrowUpward /> : <CancelOutlined />}
        confirmIcon={confirmAction === "change" ? <ArrowUpward /> : <CancelOutlined />}
        confirmLabel={confirmAction === "change" ? "Upgrade plan" : "Cancel subscription"}
        cancelLabel={confirmAction === "change" ? "Keep current plan" : "Keep subscription"}
        onClose={() => setConfirmAction("")}
        onConfirm={confirmAction === "change" ? changePlan : cancelSubscription}
      />

    </Box>
  );
}
