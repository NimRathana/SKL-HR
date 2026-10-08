"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@components/Link";
import { getApi, getAuthToken } from "@core/api";
import { notifyGlobal } from "@core/notifications";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import {
  AdminPanelSettingsOutlined,
  ArrowBack,
  BusinessOutlined,
  CheckCircle,
  GroupsOutlined,
  Payment,
} from "@mui/icons-material";

const featureLabel = (key) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Checkout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan_id");
  const interval = searchParams.get("interval") || "monthly";
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const includedFeatures = Object.entries(plan?.features || {}).filter(([, enabled]) => enabled).map(([feature]) => featureLabel(feature));
  const planLimits = [
    {
      icon: <GroupsOutlined fontSize="small" />,
      label: "Employees",
      value: plan?.max_employees == null ? "Unlimited" : `Up to ${plan.max_employees}`,
    },
    {
      icon: <BusinessOutlined fontSize="small" />,
      label: "Companies",
      value: plan?.max_companies == null ? "Unlimited" : `Up to ${plan.max_companies}`,
    },
    {
      icon: <AdminPanelSettingsOutlined fontSize="small" />,
      label: "HR users",
      value: plan?.max_hr_users == null ? "Unlimited" : `Up to ${plan.max_hr_users}`,
    },
  ];

  useEffect(() => {
    let cancelled = false;
    const loadPlan = async () => {
      if (!getAuthToken()) {
        const query = searchParams.toString();
        router.replace(`/register${query ? `?${query}` : ""}`);
        return;
      }
      if (!planId) {
        notifyGlobal("Choose an available plan before continuing.", "error");
        setLoading(false);
        return;
      }
      try {
        const api = await getApi();
        const { data } = await api.get("/plans");
        const selected = data.find((item) => item.id === planId && item.billing_interval === interval);
        if (!selected) throw new Error("This plan or billing interval is no longer available.");
        if (!cancelled) setPlan(selected);
      } catch (loadError) {
        if (!cancelled) {
          notifyGlobal(loadError?.response?.data?.detail || loadError.message || "Unable to load this plan.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPlan();
    return () => { cancelled = true; };
  }, [interval, planId, router, searchParams]);

  const handleSubscribe = async () => {
    setSubmitting(true);
    try {
      const api = await getApi();
      const { data: subscription } = await api.post(
        "/subscriptions",
        { pricing_plan_id: planId },
        { headers: { "Idempotency-Key": globalThis.crypto?.randomUUID?.() || `${planId}-${Date.now()}` } },
      );

      if (subscription.status === "pending") {
        const { data: checkout } = await api.post(`/subscriptions/${subscription.id}/checkout`);
        if (!checkout?.payment_url) throw new Error("The payment provider did not return a checkout URL.");
        window.location.assign(checkout.payment_url);
        return;
      }

      notifyGlobal("Subscription created successfully.", "success");
      router.push("/billing");
    } catch (subscribeError) {
      notifyGlobal(subscribeError?.response?.data?.detail || subscribeError.message || "Unable to start this subscription.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Button component={Link} href="/#pricing" startIcon={<ArrowBack />} size="small" sx={{ textTransform: "none" }}>
        Back to plans
      </Button>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 3 }}>
        <Avatar sx={{ width: 44, height: 44, backgroundColor: "action.hover", color: "primary.main" }}>
          <Payment />
        </Avatar>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            SUBSCRIPTION CHECKOUT
          </Typography>
          <Typography variant="h4" fontWeight={850}>
            Review your plan
          </Typography>
        </Box>
      </Stack>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Review the plan details before continuing.
      </Typography>

      <Card sx={{ mt: 3, overflow: "hidden" }}>
        <Box sx={{ height: 4, backgroundColor: "primary.main" }} />
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress /></Stack>
          ) : plan ? (
            <>
              <Grid container spacing={{ xs: 3, md: 4 }}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h5" fontWeight={850}>{plan.name}</Typography>
                    <Chip label={plan.billing_interval} size="small" sx={{ textTransform: "capitalize" }} />
                  </Stack>
                  {plan.description && (
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {plan.description}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2.5, p: 2, backgroundColor: "action.hover", borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={750}>
                      TOTAL PER {plan.billing_interval === "yearly" ? "YEAR" : "MONTH"}
                    </Typography>
                    <Typography variant="h3" fontWeight={850} color="primary.main">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: plan.currency,
                      }).format(Number(plan.price))}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Included with this plan
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1.25 }}>
                    {includedFeatures.length ? includedFeatures.map((feature) => (
                      <Stack key={feature} direction="row" spacing={1} alignItems="center">
                        <CheckCircle color="success" fontSize="small" />
                        <Typography variant="body2">{feature}</Typography>
                      </Stack>
                    )) : (
                      <Typography variant="body2" color="text.secondary">
                        No additional feature details are listed for this plan.
                      </Typography>
                    )}
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={1.25}>
                    {planLimits.map((limit) => (
                      <Grid key={limit.label} size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 1.25, height: "100%", backgroundColor: "action.hover", borderRadius: 1 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" color="primary.main">
                            {limit.icon}
                            <Typography variant="caption" color="text.secondary" fontWeight={750}>
                              {limit.label}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={750} sx={{ mt: 0.5 }}>
                            {limit.value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
              <Divider sx={{ my: 3 }} />
              <Button
                fullWidth
                variant="contained"
                disabled={submitting}
                onClick={handleSubscribe}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Payment />}
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                {submitting ? "Starting subscription" : Number(plan.price) === 0 ? "Start free plan" : "Continue"}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}
